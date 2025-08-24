-- PostgreSQL database schema for nmapper network monitoring system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Network snapshots table - stores complete network state at a point in time
CREATE TABLE network_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    device_count INTEGER NOT NULL DEFAULT 0,
    total_ports INTEGER NOT NULL DEFAULT 0,
    checksum VARCHAR(64) NOT NULL,
    scan_duration INTEGER NOT NULL, -- milliseconds
    scan_type VARCHAR(50) NOT NULL,
    errors TEXT[],
    nmap_version VARCHAR(20),
    scan_parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT valid_device_count CHECK (device_count >= 0),
    CONSTRAINT valid_total_ports CHECK (total_ports >= 0),
    CONSTRAINT valid_scan_duration CHECK (scan_duration > 0)
);

-- Devices table - stores discovered network devices
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_id UUID NOT NULL REFERENCES network_snapshots(id) ON DELETE CASCADE,
    ip INET NOT NULL,
    mac MACADDR,
    hostname VARCHAR(253),
    vendor VARCHAR(255),
    device_type VARCHAR(50),
    os_name VARCHAR(100),
    os_version VARCHAR(50),
    os_accuracy SMALLINT CHECK (os_accuracy >= 0 AND os_accuracy <= 100),
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL,
    uptime_seconds BIGINT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    risk_level VARCHAR(10) CHECK (risk_level IN ('low', 'medium', 'high')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    INDEX idx_devices_snapshot_id (snapshot_id),
    INDEX idx_devices_ip (ip),
    INDEX idx_devices_mac (mac),
    INDEX idx_devices_last_seen (last_seen),
    INDEX idx_devices_is_active (is_active),
    
    CONSTRAINT valid_ip CHECK (ip IS NOT NULL),
    CONSTRAINT valid_os_accuracy CHECK (os_accuracy IS NULL OR (os_accuracy >= 0 AND os_accuracy <= 100))
);

-- Ports table - stores open ports for each device
CREATE TABLE ports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    port_number INTEGER NOT NULL CHECK (port_number >= 1 AND port_number <= 65535),
    protocol VARCHAR(10) NOT NULL CHECK (protocol IN ('tcp', 'udp')),
    state VARCHAR(20) NOT NULL CHECK (state IN ('open', 'closed', 'filtered')),
    service_name VARCHAR(100),
    service_version VARCHAR(255),
    banner TEXT,
    tunnel VARCHAR(50),
    method VARCHAR(50),
    confidence SMALLINT CHECK (confidence >= 0 AND confidence <= 100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    INDEX idx_ports_device_id (device_id),
    INDEX idx_ports_port_protocol (port_number, protocol),
    INDEX idx_ports_state (state),
    INDEX idx_ports_service_name (service_name),
    
    UNIQUE (device_id, port_number, protocol)
);

-- Device history table - tracks changes to devices over time
CREATE TABLE device_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_ip INET NOT NULL,
    snapshot_id UUID NOT NULL REFERENCES network_snapshots(id) ON DELETE CASCADE,
    change_type VARCHAR(50) NOT NULL CHECK (
        change_type IN (
            'device_joined', 'device_left', 'device_changed', 
            'device_inactive', 'port_opened', 'port_closed', 
            'service_changed', 'os_changed'
        )
    ),
    changes JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    INDEX idx_device_history_ip (device_ip),
    INDEX idx_device_history_snapshot_id (snapshot_id),
    INDEX idx_device_history_change_type (change_type),
    INDEX idx_device_history_timestamp (timestamp)
);

-- Snapshot diffs table - stores differences between snapshots
CREATE TABLE snapshot_diffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_snapshot_id UUID NOT NULL REFERENCES network_snapshots(id) ON DELETE CASCADE,
    to_snapshot_id UUID NOT NULL REFERENCES network_snapshots(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    devices_added INTEGER NOT NULL DEFAULT 0,
    devices_removed INTEGER NOT NULL DEFAULT 0,
    devices_changed INTEGER NOT NULL DEFAULT 0,
    ports_changed INTEGER NOT NULL DEFAULT 0,
    services_changed INTEGER NOT NULL DEFAULT 0,
    total_changes INTEGER NOT NULL DEFAULT 0,
    diff_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    INDEX idx_snapshot_diffs_from_snapshot (from_snapshot_id),
    INDEX idx_snapshot_diffs_to_snapshot (to_snapshot_id),
    INDEX idx_snapshot_diffs_timestamp (timestamp),
    
    CONSTRAINT valid_change_counts CHECK (
        devices_added >= 0 AND devices_removed >= 0 AND devices_changed >= 0 AND
        ports_changed >= 0 AND services_changed >= 0 AND total_changes >= 0
    ),
    CONSTRAINT different_snapshots CHECK (from_snapshot_id != to_snapshot_id),
    UNIQUE (from_snapshot_id, to_snapshot_id)
);

-- Configuration table - stores application settings
CREATE TABLE configuration (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default configuration values
INSERT INTO configuration (key, value, description) VALUES
    ('scan_interval', '300000', 'Interval between network scans in milliseconds'),
    ('default_network_range', '"192.168.1.0/24"', 'Default network range to scan'),
    ('default_port_range', '"1-1000"', 'Default port range for scanning'),
    ('max_concurrent_scans', '1', 'Maximum number of concurrent network scans'),
    ('snapshot_retention_days', '30', 'Number of days to retain snapshots'),
    ('enable_change_notifications', 'true', 'Enable notifications for network changes'),
    ('database_pool_size', '10', 'Database connection pool size'),
    ('scan_timeout', '30000', 'Network scan timeout in milliseconds');

-- Create indexes for performance optimization
CREATE INDEX idx_network_snapshots_timestamp ON network_snapshots(timestamp DESC);
CREATE INDEX idx_network_snapshots_checksum ON network_snapshots(checksum);

-- Create function to update timestamp on configuration changes
CREATE OR REPLACE FUNCTION update_configuration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for configuration timestamp updates
CREATE TRIGGER trigger_update_configuration_timestamp
    BEFORE UPDATE ON configuration
    FOR EACH ROW
    EXECUTE FUNCTION update_configuration_timestamp();

-- Create function to calculate total_changes in snapshot_diffs
CREATE OR REPLACE FUNCTION calculate_total_changes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_changes = NEW.devices_added + NEW.devices_removed + NEW.devices_changed + 
                       NEW.ports_changed + NEW.services_changed;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic total_changes calculation
CREATE TRIGGER trigger_calculate_total_changes
    BEFORE INSERT OR UPDATE ON snapshot_diffs
    FOR EACH ROW
    EXECUTE FUNCTION calculate_total_changes();

-- Create view for latest device information across all snapshots
CREATE VIEW latest_devices AS
SELECT DISTINCT ON (d.ip) 
    d.id,
    d.ip,
    d.mac,
    d.hostname,
    d.vendor,
    d.device_type,
    d.os_name,
    d.os_version,
    d.os_accuracy,
    d.last_seen,
    d.uptime_seconds,
    d.is_active,
    d.risk_level,
    d.notes,
    ns.timestamp as snapshot_timestamp
FROM devices d
JOIN network_snapshots ns ON d.snapshot_id = ns.id
ORDER BY d.ip, ns.timestamp DESC;

-- Create view for device port summary
CREATE VIEW device_port_summary AS
SELECT 
    d.id as device_id,
    d.ip,
    d.hostname,
    COUNT(p.id) as total_ports,
    COUNT(CASE WHEN p.state = 'open' THEN 1 END) as open_ports,
    COUNT(CASE WHEN p.state = 'closed' THEN 1 END) as closed_ports,
    COUNT(CASE WHEN p.state = 'filtered' THEN 1 END) as filtered_ports,
    array_agg(DISTINCT p.service_name) FILTER (WHERE p.service_name IS NOT NULL) as services
FROM devices d
LEFT JOIN ports p ON d.id = p.device_id
GROUP BY d.id, d.ip, d.hostname;

-- Create view for network scan statistics
CREATE VIEW scan_statistics AS
SELECT 
    DATE_TRUNC('day', timestamp) as scan_date,
    COUNT(*) as scans_count,
    AVG(device_count) as avg_devices,
    MAX(device_count) as max_devices,
    AVG(scan_duration) as avg_scan_duration,
    MIN(scan_duration) as min_scan_duration,
    MAX(scan_duration) as max_scan_duration
FROM network_snapshots
GROUP BY DATE_TRUNC('day', timestamp)
ORDER BY scan_date DESC;