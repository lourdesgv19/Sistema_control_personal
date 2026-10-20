package backend.controller;

import backend.service.NotificacionTiempoRealService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/stream")
@CrossOrigin(origins = "*")
public class NotificacionTiempoRealController {

    private final NotificacionTiempoRealService notificacionService;

    public NotificacionTiempoRealController(NotificacionTiempoRealService notificacionService) {
        this.notificacionService = notificacionService;
    }

    @GetMapping(value = "/eventos", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter conectarStream() {
        return notificacionService.suscribir();
    }
}