package backend.controller;

import backend.dto.AuthResponse;
import backend.dto.LoginRequest;
import backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }
    
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest request) {
    try {
        AuthResponse res = authService.login(request);
        return ResponseEntity.ok(res);
    } catch (Exception e) {
        throw e;
    }
}
}