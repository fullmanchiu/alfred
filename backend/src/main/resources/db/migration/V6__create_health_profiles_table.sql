-- 创建健康档案表
CREATE TABLE health_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 身体尺寸
    height REAL,              -- 身高(cm)
    weight REAL,              -- 体重(kg)

    -- 体成分
    body_fat REAL,            -- 体脂率(%)
    muscle_rate REAL,         -- 肌肉率(%)
    water_rate REAL,          -- 水分率(%)
    bone_mass REAL,           -- 骨量(kg)
    protein_rate REAL,        -- 蛋白质率(%)

    -- 代谢指标
    bmr INTEGER,              -- 基础代谢(kcal)
    visceral_fat INTEGER,     -- 内脏脂肪等级

    -- 计算指标
    bmi REAL,                 -- 体质指数

    -- 审计字段
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX idx_health_profiles_user_id ON health_profiles(user_id);
CREATE INDEX idx_health_profiles_created_at ON health_profiles(created_at DESC);

-- 添加表注释
COMMENT ON TABLE health_profiles IS '健康档案表：存储用户的身体成分数据';
COMMENT ON COLUMN health_profiles.height IS '身高（厘米）';
COMMENT ON COLUMN health_profiles.weight IS '体重（千克）';
COMMENT ON COLUMN health_profiles.body_fat IS '体脂率（百分比）';
COMMENT ON COLUMN health_profiles.muscle_rate IS '肌肉率（百分比）';
COMMENT ON COLUMN health_profiles.water_rate IS '水分率（百分比）';
COMMENT ON COLUMN health_profiles.bone_mass IS '骨量（千克）';
COMMENT ON COLUMN health_profiles.protein_rate IS '蛋白质率（百分比）';
COMMENT ON COLUMN health_profiles.bmr IS '基础代谢（千卡）';
COMMENT ON COLUMN health_profiles.visceral_fat IS '内脏脂肪等级';
COMMENT ON COLUMN health_profiles.bmi IS '体质指数';
