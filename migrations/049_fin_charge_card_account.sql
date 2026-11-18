-- 049_fin_charge_card_account.sql — MYE Admin: keep the Amex "Account #" column.
--
-- The spec asks the statement import to capture the Amex "Account #" column when
-- the download has one (it identifies which physical card a charge was made on,
-- e.g. "-41007"). 048 has no column for it, so this adds one. Nullable: older
-- downloads and CSVs without the column simply leave it empty.
ALTER TABLE fin_charges ADD COLUMN IF NOT EXISTS card_account TEXT;
