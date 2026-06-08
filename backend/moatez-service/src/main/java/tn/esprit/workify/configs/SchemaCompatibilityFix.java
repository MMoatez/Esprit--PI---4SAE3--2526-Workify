package tn.esprit.workify.configs;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class SchemaCompatibilityFix {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void ensureLegacyPackColumnsAreNullable() {
        ensureLegacyPackColumnExists("price", "FLOAT NULL");
        ensureLegacyPackColumnExists("duration", "ENUM('ONE_MONTH','THREE_MONTHS','SIX_MONTHS','ONE_YEAR') NULL");

        ensureTimestampColumnExistsAndManaged("created_at", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP");
        ensureTimestampColumnExistsAndManaged("updated_at", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

        relaxLegacyPackColumnIfRequired("duration");
        relaxLegacyPackColumnIfRequired("price");

        ensurePackOptionsBackfilledFromLegacyPack();
    }

    private void ensurePackOptionsBackfilledFromLegacyPack() {
        List<Map<String, Object>> tableExists = jdbcTemplate.queryForList(
                """
                SELECT 1
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'pack_option'
                """
        );

        if (tableExists.isEmpty()) {
            log.warn("Schema compatibility fix skipped: table pack_option does not exist yet");
            return;
        }

        int inserted = jdbcTemplate.update(
                """
                INSERT INTO pack_option (pack_id, duration, price, active)
                SELECT p.id, p.duration, p.price, COALESCE(p.active, 1)
                FROM pack p
                LEFT JOIN pack_option po ON po.pack_id = p.id
                WHERE po.id IS NULL
                  AND p.duration IS NOT NULL
                  AND p.price IS NOT NULL
                """
        );

        if (inserted > 0) {
            log.warn("Schema compatibility fix applied: {} pack_option row(s) backfilled from legacy pack fields", inserted);
        }
    }

    private void ensureLegacyPackColumnExists(String columnName, String definition) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                SELECT 1
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'pack'
                  AND COLUMN_NAME = ?
                """,
                columnName
        );

        if (!rows.isEmpty()) {
            return;
        }

        jdbcTemplate.execute("ALTER TABLE pack ADD COLUMN " + columnName + " " + definition);
        log.warn("Schema compatibility fix applied: pack.{} created", columnName);
    }

    private void ensureTimestampColumnExistsAndManaged(String columnName, String definition) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                SELECT IS_NULLABLE, DATA_TYPE, COLUMN_DEFAULT, EXTRA
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'pack'
                  AND COLUMN_NAME = ?
                """,
                columnName
        );

        if (rows.isEmpty()) {
            jdbcTemplate.execute("ALTER TABLE pack ADD COLUMN " + columnName + " " + definition);
            log.warn("Schema compatibility fix applied: pack.{} created with managed timestamp", columnName);
            return;
        }

        jdbcTemplate.execute("ALTER TABLE pack MODIFY COLUMN " + columnName + " " + definition);
        log.warn("Schema compatibility fix applied: pack.{} set to managed timestamp", columnName);
    }

    private void relaxLegacyPackColumnIfRequired(String columnName) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                """
                SELECT IS_NULLABLE, DATA_TYPE, COLUMN_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'pack'
                  AND COLUMN_NAME = ?
                """,
                columnName
        );

        if (rows.isEmpty()) {
            return;
        }

        Map<String, Object> column = rows.get(0);
        String isNullable = String.valueOf(column.get("IS_NULLABLE"));
        if ("YES".equalsIgnoreCase(isNullable)) {
            return;
        }

        String dataType = String.valueOf(column.get("DATA_TYPE")).toLowerCase();
        String columnType = String.valueOf(column.get("COLUMN_TYPE"));

        String alterSql;
        if ("enum".equals(dataType)) {
            alterSql = "ALTER TABLE pack MODIFY COLUMN " + columnName + " " + columnType + " NULL";
        } else {
            alterSql = "ALTER TABLE pack MODIFY COLUMN " + columnName + " " + columnType + " NULL";
        }

        jdbcTemplate.execute(alterSql);
        log.warn("Schema compatibility fix applied: pack.{} switched to NULLABLE", columnName);
    }
}
