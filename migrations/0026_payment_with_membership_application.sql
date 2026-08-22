PRAGMA foreign_keys = ON;

DROP TRIGGER membership_payment_requests_validate_insert;
CREATE TRIGGER membership_payment_requests_validate_insert
BEFORE INSERT ON membership_payment_requests
WHEN NOT EXISTS (
  SELECT 1
  FROM membership_applications ma
  JOIN membership_types mt ON mt.id = ma.membership_type_id
  WHERE ma.id = NEW.application_id
    AND (
      (ma.status = 'SUBMITTED' AND NEW.requested_by = ma.user_id)
      OR ma.status = 'UNDER_REVIEW'
    )
    AND mt.payment_required = 1
    AND mt.fee_minor IS NOT NULL
    AND NEW.expected_amount_minor = mt.fee_minor
    AND NEW.currency = mt.currency
)
BEGIN
  SELECT RAISE(ABORT, 'membership payment request is not eligible');
END;

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
    AND ma.status IN ('SUBMITTED', 'UNDER_REVIEW', 'PAYMENT_PENDING')
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

DROP TRIGGER membership_application_decisions_validate_insert;
CREATE TRIGGER membership_application_decisions_validate_insert
BEFORE INSERT ON membership_application_decisions
WHEN NOT EXISTS (
  SELECT 1
  FROM membership_applications ma
  JOIN membership_types mt ON mt.id = ma.membership_type_id
  WHERE ma.id = NEW.application_id
    AND (
      (NEW.decision = 'REJECTED' AND ma.status IN ('UNDER_REVIEW', 'PAYMENT_PENDING', 'PAYMENT_VERIFICATION'))
      OR (
        NEW.decision = 'APPROVED'
        AND (
          (ma.status = 'UNDER_REVIEW' AND mt.payment_required = 0)
          OR (
            ma.status IN ('UNDER_REVIEW', 'PAYMENT_VERIFICATION')
            AND mt.payment_required = 1
            AND EXISTS (
              SELECT 1 FROM membership_payments mp
              WHERE mp.application_id = ma.id AND mp.status = 'VERIFIED'
            )
          )
        )
      )
    )
)
BEGIN
  SELECT RAISE(ABORT, 'membership application decision is not eligible');
END;

UPDATE platform_settings
SET value_json = '{"phone":"+880 1580-352238","paymentNumber":"01580352238","paymentMethods":["BKASH","NAGAD"],"paymentInstructions":"Use Send Money from bKash or Nagad to 01580352238, then enter the sender mobile number and transaction ID while submitting the membership application. Payment evidence is independently verified before approval."}',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE setting_key = 'website.membership';

UPDATE platform_settings
SET value_json = '"0.7.0"',
    description = 'Atomic membership application and bKash or Nagad payment evidence submission workflow',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE setting_key = 'platform.payments.version';
