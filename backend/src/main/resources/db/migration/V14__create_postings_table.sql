-- Postings 表：复式记账的核心，记录每笔交易的借贷分录
CREATE TABLE postings (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL,
    account_id BIGINT NOT NULL,
    account_type VARCHAR(20) NOT NULL, -- 'user' 或 'system'
    entry_type VARCHAR(10) NOT NULL, -- 'DEBIT' 或 'CREDIT'
    amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_postings_transaction FOREIGN KEY (transaction_id)
        REFERENCES transactions(id) ON DELETE CASCADE,
    CONSTRAINT fk_postings_account FOREIGN KEY (account_id)
        REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT chk_entry_type CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    CONSTRAINT chk_account_type CHECK (account_type IN ('user', 'system'))
);

-- 索引
CREATE INDEX idx_postings_transaction ON postings(transaction_id);
CREATE INDEX idx_postings_account ON postings(account_id);
CREATE INDEX idx_postings_account_type ON postings(account_type);

-- 确保每笔交易的借贷平衡
CREATE OR REPLACE FUNCTION check_double_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
    debit_sum DECIMAL(15,2);
    credit_sum DECIMAL(15,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO debit_sum
    FROM postings
    WHERE transaction_id = NEW.transaction_id AND entry_type = 'DEBIT';

    SELECT COALESCE(SUM(amount), 0) INTO credit_sum
    FROM postings
    WHERE transaction_id = NEW.transaction_id AND entry_type = 'CREDIT';

    IF debit_sum != credit_sum THEN
        RAISE EXCEPTION 'Double entry balance violated: debits (%) must equal credits (%)',
            debit_sum, credit_sum;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_double_entry_balance
    AFTER INSERT OR UPDATE ON postings
    FOR EACH ROW
    EXECUTE FUNCTION check_double_entry_balance();
