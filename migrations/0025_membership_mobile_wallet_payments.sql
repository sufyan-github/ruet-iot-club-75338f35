PRAGMA foreign_keys = ON;

ALTER TABLE membership_payment_requests ADD COLUMN payment_methods_json TEXT NOT NULL
  DEFAULT '["BKASH","NAGAD"]'
  CHECK (json_valid(payment_methods_json) AND json_type(payment_methods_json) = 'array');
ALTER TABLE membership_payment_requests ADD COLUMN payment_number TEXT NOT NULL
  DEFAULT '01580352238'
  CHECK (length(payment_number) BETWEEN 11 AND 20);
ALTER TABLE membership_payment_requests ADD COLUMN payment_instructions TEXT NOT NULL
  DEFAULT 'Pay only after an official payment request. Use Send Money from bKash or Nagad to 01580352238, keep the transaction ID, and submit it for verification.'
  CHECK (length(payment_instructions) BETWEEN 20 AND 1000);

ALTER TABLE membership_payments ADD COLUMN payer_phone TEXT
  CHECK (payer_phone IS NULL OR length(payer_phone) BETWEEN 11 AND 20);

DROP TRIGGER membership_payments_validate_application_submission;
CREATE TRIGGER membership_payments_validate_application_submission
BEFORE INSERT ON membership_payments
WHEN NEW.application_id IS NOT NULL AND NOT EXISTS (
  SELECT 1
  FROM membership_payment_requests mpr
  JOIN membership_applications ma ON ma.id = mpr.application_id
  WHERE mpr.id = NEW.payment_request_id
    AND mpr.application_id = NEW.application_id
    AND ma.user_id = NEW.submitted_by
    AND ma.status = 'PAYMENT_PENDING'
    AND NEW.expected_amount_minor = mpr.expected_amount_minor
    AND NEW.currency = mpr.currency
    AND NEW.status = 'SUBMITTED'
    AND NEW.payer_phone IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM json_each(mpr.payment_methods_json)
      WHERE value = NEW.payment_method
    )
)
BEGIN
  SELECT RAISE(ABORT, 'membership payment submission is not eligible');
END;

DROP TRIGGER membership_payments_protect_evidence;
CREATE TRIGGER membership_payments_protect_evidence
BEFORE UPDATE OF application_id, renewal_id, payment_request_id, expected_amount_minor,
  currency, payment_method, payer_phone, transaction_reference, submitted_by, submitted_at
ON membership_payments
BEGIN
  SELECT RAISE(ABORT, 'payment evidence fields are immutable');
END;

UPDATE platform_settings
SET value_json = '{"phone":"+880 1580-352238","paymentNumber":"01580352238","paymentMethods":["BKASH","NAGAD"],"paymentInstructions":"Pay only after an official payment request appears in your membership workspace. Use Send Money from bKash or Nagad to 01580352238, keep the transaction ID, and submit the evidence for independent verification."}',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE setting_key = 'website.membership';

INSERT INTO platform_settings (setting_key, value_json, is_public, description)
VALUES (
  'platform.payments.version',
  '"0.6.0"',
  1,
  'Server-owned bKash and Nagad membership payment request and verification workflow'
)
ON CONFLICT(setting_key) DO UPDATE SET
  value_json = excluded.value_json,
  description = excluded.description,
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');
