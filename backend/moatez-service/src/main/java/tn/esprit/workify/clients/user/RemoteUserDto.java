package tn.esprit.workify.clients.user;

import lombok.Data;

@Data
public class RemoteUserDto {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String role;

    public Integer getIdAsInteger() {
        return id == null ? null : id.intValue();
    }

    public String getFullName() {
        String first = firstName == null ? "" : firstName.trim();
        String last = lastName == null ? "" : lastName.trim();
        String full = (first + " " + last).trim();
        return full.isBlank() ? "-" : full;
    }

    public boolean hasRole(String expectedRole) {
        return role != null && expectedRole != null && role.equalsIgnoreCase(expectedRole);
    }
}
