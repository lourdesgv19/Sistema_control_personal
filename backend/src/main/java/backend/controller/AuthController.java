package backend.controller;

import backend.dto.AuthResponse;
import backend.dto.LoginRequest;
import backend.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest request) {
    System.out.println(">>> [AUTH CONTROLLER] Llegó petición de login para usuario: " + request.username());
    try {
        AuthResponse res = authService.login(request);
        System.out.println(">>> [AUTH CONTROLLER] Login exitoso para: " + request.username());
        return ResponseEntity.ok(res);
    } catch (Exception e) {
        System.err.println(">>> [AUTH CONTROLLER] Error en servicio de login: " + e.getClass().getSimpleName() + " - " + e.getMessage());
        throw e;
    }
}
}