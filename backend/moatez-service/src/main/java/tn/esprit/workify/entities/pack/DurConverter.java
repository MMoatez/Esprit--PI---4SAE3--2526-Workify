package tn.esprit.workify.entities.pack;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class DurConverter implements AttributeConverter<Dur, String> {

    @Override
    public String convertToDatabaseColumn(Dur attribute) {
        return attribute != null ? attribute.name() : null;
    }

    @Override
    public Dur convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }
        try {
            return Dur.valueOf(dbData);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
