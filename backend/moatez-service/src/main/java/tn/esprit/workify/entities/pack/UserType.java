package tn.esprit.workify.entities.pack;

public enum UserType {
    FREELANCER("Freelancer"),
    CLIENT("Client"),
    FREELANCER_CLIENT("Freelancer/Client"),
    PARTNER("Partner");

    private final String displayName;

    UserType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}