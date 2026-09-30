package backend.dto;

public record LoginRequest(
    String username, // o email
    String password
) {}