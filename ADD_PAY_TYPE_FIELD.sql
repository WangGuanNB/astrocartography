-- 添加 pay_type 字段到 orders_astrocarto 表
-- 用于区分支付方式：creem, paypal, stripe

ALTER TABLE orders_astrocarto 
ADD COLUMN pay_type VARCHAR(50);

-- 可选：为现有订单设置默认值（假设现有订单都是 Creem 支付）
-- 如果你的现有订单有其他支付方式，请根据实际情况调整
UPDATE orders_astrocarto 
SET pay_type = 'creem' 
WHERE pay_type IS NULL AND status = 'paid';

-- 验证字段已添加
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'orders_astrocarto' AND column_name = 'pay_type';
