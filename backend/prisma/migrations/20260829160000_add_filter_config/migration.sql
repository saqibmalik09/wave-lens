-- Server-driven filter definitions: the license endpoint delivers each filter's
-- config (params/lut/sticker) to installed SDKs, so new filters and tuning changes
-- reach live apps without an app rebuild.
ALTER TABLE `filters` ADD COLUMN `config` JSON NULL;
