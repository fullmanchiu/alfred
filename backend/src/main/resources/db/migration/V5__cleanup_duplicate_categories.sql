-- 清理重复的 (user_id, config_id) 记录
-- 策略：保留每个 (user_id, config_id) 组合中 ID 最小的记录，删除其余的
-- 注意：只清理 config_id 不为 NULL 的记录

-- 首先查看重复记录的情况（注释掉，仅用于调试）
-- SELECT user_id, config_id, COUNT(*) as count
-- FROM categories
-- WHERE config_id IS NOT NULL
-- GROUP BY user_id, config_id
-- HAVING COUNT(*) > 1;

-- 清理重复记录：保留 ID 最小的，删除其余的
DELETE FROM categories
WHERE id IN (
    SELECT id FROM (
        SELECT c1.id
        FROM categories c1
        WHERE c1.config_id IS NOT NULL
          AND EXISTS (
              SELECT 1
              FROM categories c2
              WHERE c2.user_id = c1.user_id
                AND c2.config_id = c1.config_id
                AND c2.config_id IS NOT NULL
                AND c2.id < c1.id
          )
    ) AS duplicates
);

-- 验证清理结果（注释掉，仅用于调试）
-- SELECT user_id, config_id, COUNT(*) as count
-- FROM categories
-- WHERE config_id IS NOT NULL
-- GROUP BY user_id, config_id
-- HAVING COUNT(*) > 1;
