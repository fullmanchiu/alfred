-- 创建运动记录表
CREATE TABLE activities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 基本信息
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,      -- running, cycling, swimming等

    -- 汇总数据（从GPS点计算得出）
    distance INTEGER,               -- 距离(米)
    duration INTEGER,               -- 时长(秒)
    avg_speed REAL,                 -- 平均速度(m/s)
    max_speed REAL,                 -- 最大速度(m/s)
    total_elevation INTEGER,        -- 总爬升(米)

    -- 生理数据汇总
    avg_heart_rate INTEGER,         -- 平均心率
    max_heart_rate INTEGER,         -- 最大心率
    avg_power INTEGER,              -- 平均功率(瓦)
    max_power INTEGER,              -- 最大功率(瓦)
    avg_cadence INTEGER,            -- 平均踏频(rpm)
    calories INTEGER,               -- 消耗卡路里

    -- 时间范围
    start_time TIMESTAMP,
    end_time TIMESTAMP,

    -- 审计字段
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建运动轨迹点表
CREATE TABLE activity_points (
    id BIGSERIAL PRIMARY KEY,
    activity_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,

    -- 时间戳
    time TIMESTAMP,

    -- GPS位置
    latitude DOUBLE PRECISION,      -- 纬度
    longitude DOUBLE PRECISION,     -- 经度
    elevation REAL,                 -- 海拔(米)

    -- 运动数据
    speed REAL,                     -- 速度(m/s)
    heart_rate INTEGER,             -- 心率
    power INTEGER,                  -- 功率(瓦)
    cadence INTEGER                 -- 踏频(rpm)
);

-- 创建运动分段数据表
CREATE TABLE activity_laps (
    id BIGSERIAL PRIMARY KEY,
    activity_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,

    lap_index INTEGER NOT NULL,     -- 分段序号（从1开始）
    start_time TIMESTAMP,
    elapsed_time INTEGER,           -- 经过时间(秒)
    distance INTEGER,               -- 距离(米)
    avg_heart_rate INTEGER,         -- 平均心率
    avg_power INTEGER,              -- 平均功率(瓦)
    avg_speed REAL                 -- 平均速度(m/s)
);

-- 创建索引以提高查询性能
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC);
CREATE INDEX idx_activities_type ON activities(type);

CREATE INDEX idx_activity_points_activity_id ON activity_points(activity_id);
CREATE INDEX idx_activity_points_time ON activity_points(time);

CREATE INDEX idx_activity_laps_activity_id ON activity_laps(activity_id);

-- 添加表注释
COMMENT ON TABLE activities IS '运动记录表：存储用户的运动数据';
COMMENT ON TABLE activity_points IS '运动轨迹点表：存储GPS轨迹和传感器数据';
COMMENT ON TABLE activity_laps IS '运动分段数据表：存储运动记录的分段信息';

-- 添加列注释
COMMENT ON COLUMN activities.type IS '运动类型：running, cycling, swimming等';
COMMENT ON COLUMN activities.distance IS '距离（米）';
COMMENT ON COLUMN activities.duration IS '时长（秒）';
COMMENT ON COLUMN activities.avg_speed IS '平均速度（米/秒）';
COMMENT ON COLUMN activities.calories IS '消耗卡路里';

COMMENT ON COLUMN activity_points.latitude IS '纬度';
COMMENT ON COLUMN activity_points.longitude IS '经度';
COMMENT ON COLUMN activity_points.heart_rate IS '心率';
COMMENT ON COLUMN activity_points.power IS '功率（瓦）';

COMMENT ON COLUMN activity_laps.lap_index IS '分段序号（从1开始）';
COMMENT ON COLUMN activity_laps.elapsed_time IS '经过时间（秒）';
