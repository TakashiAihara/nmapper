-- Create views for common data access patterns

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
    ns.timestamp as snapshot_timestamp,
    ns.id as snapshot_id
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

-- Create view for device activity summary
CREATE VIEW device_activity_summary AS
SELECT 
    d.ip,
    d.hostname,
    d.vendor,
    d.device_type,
    COUNT(DISTINCT d.snapshot_id) as appearances,
    MIN(ns.timestamp) as first_seen,
    MAX(ns.timestamp) as last_seen,
    MAX(d.last_seen) as device_last_seen,
    bool_or(d.is_active) as ever_active,
    array_agg(DISTINCT d.risk_level) FILTER (WHERE d.risk_level IS NOT NULL) as risk_levels
FROM devices d
JOIN network_snapshots ns ON d.snapshot_id = ns.id
GROUP BY d.ip, d.hostname, d.vendor, d.device_type
ORDER BY last_seen DESC;

-- Create view for port activity across all devices
CREATE VIEW port_activity_summary AS
SELECT 
    p.port_number,
    p.protocol,
    p.service_name,
    COUNT(DISTINCT p.device_id) as device_count,
    COUNT(DISTINCT CASE WHEN p.state = 'open' THEN p.device_id END) as devices_with_open_port,
    array_agg(DISTINCT d.ip ORDER BY d.ip) as device_ips,
    array_agg(DISTINCT p.service_version) FILTER (WHERE p.service_version IS NOT NULL) as service_versions
FROM ports p
JOIN devices d ON p.device_id = d.id
GROUP BY p.port_number, p.protocol, p.service_name
ORDER BY device_count DESC, p.port_number;