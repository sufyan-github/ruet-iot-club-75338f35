INSERT INTO platform_settings (setting_key, value_json, is_public, description) VALUES
  ('website.contact', '{"generalEmail":"ruetiotclub@gmail.com","phone":"+880 1580-352238"}', 1, 'Public club contact details.'),
  ('website.membership', '{"phone":"+880 1580-352238","paymentInstructions":"Contact this number for membership payment queries, bKash/Nagad transactions, and membership support."}', 1, 'Public membership and payment contact details.'),
  ('website.location', '{"address":"Rajshahi University of Engineering & Technology, Kazla, Rajshahi-6204, Bangladesh","mapEmbedUrl":"https://www.google.com/maps?q=Rajshahi%20University%20of%20Engineering%20%26%20Technology%2C%20Kazla%2C%20Rajshahi%206204%2C%20Bangladesh&output=embed","mapOpenUrl":"https://www.google.com/maps/search/?api=1&query=Rajshahi%20University%20of%20Engineering%20%26%20Technology%2C%20Kazla%2C%20Rajshahi%206204%2C%20Bangladesh"}', 1, 'Public verified RUET address and map links.')
ON CONFLICT(setting_key) DO NOTHING;
