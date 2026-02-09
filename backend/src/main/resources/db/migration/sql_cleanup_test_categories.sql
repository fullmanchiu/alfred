-- 删除所有名称包含"测试"的分类
-- 注意:由于有外键约束,需要先删除子分类,再删除父分类

-- 显示将被删除的分类(查看用)
SELECT id, name, icon, parent_id, type
FROM categories
WHERE name LIKE '%测试%'
ORDER BY parent_id, id;

-- 删除子分类(有parent_id的)
DELETE FROM categories
WHERE name LIKE '%测试%'
  AND parent_id IS NOT NULL;

-- 删除父分类(没有parent_id的)
DELETE FROM categories
WHERE name LIKE '%测试%'
  AND parent_id IS NULL;

-- 验证删除结果
SELECT COUNT(*) as remaining_test_categories
FROM categories
WHERE name LIKE '%测试%';
