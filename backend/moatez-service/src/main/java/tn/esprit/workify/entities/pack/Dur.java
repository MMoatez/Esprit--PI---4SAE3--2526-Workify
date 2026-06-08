package tn.esprit.workify.entities.pack;

public enum Dur {
    ONE_MONTH("1 month"),
    THREE_MONTHS("3 months"),
    SIX_MONTHS("6 months"),
    ONE_YEAR("1 year");

    private final String displayName;

    Dur(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}