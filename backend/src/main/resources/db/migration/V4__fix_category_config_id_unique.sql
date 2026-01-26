-- 清理重复的 config_id 记录，保留每个 (user_id, config_id) 组合中 ID 最小的记录
DELETE FROM categories c1
WHERE c1.id NOT IN (
    SELECT MIN(id) FROM categories c2
    WHERE c1.user_id = c2.user_id
      AND c1.config_id = c2.config_id
      AND c1.config_id IS NOT NULL
    GROUP BY c2.user_id, c2.config_id
);

-- 添加唯一约束确保 (user_id, config_id) 组合唯一
ALTER TABLE categories ADD CONSTRAINT uk_user_config_id UNIQUE (user_id, config_id);
