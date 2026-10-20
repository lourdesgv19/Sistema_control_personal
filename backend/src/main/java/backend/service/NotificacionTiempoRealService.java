package backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class NotificacionTiempoRealService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionTiempoRealService.class);
    private final List<SseEmitter> clientes = new CopyOnWriteArrayList<>();

    public SseEmitter suscribir() {
        // Timeout infinito (0L) para mantener el canal abierto
        SseEmitter emitter = new SseEmitter(0L);
        clientes.add(emitter);

        emitter.onCompletion(() -> clientes.remove(emitter));
        emitter.onTimeout(() -> {
            emitter.complete();
            clientes.remove(emitter);
        });
        emitter.onError((e) -> {
            emitter.complete();
            clientes.remove(emitter);
        });

        // Enviar evento inicial de confirmación de conexión
        try {
            emitter.send(SseEmitter.event()
                    .name("conectado")
                    .data(Map.of("estado", "SSE_ACTIVO", "timestamp", System.currentTimeMillis())));
        } catch (IOException e) {
            clientes.remove(emitter);
        }

        return emitter;
    }

    public void notificarCambio(String tipoEvento) {
        log.info(">>> Emitiendo actualización en tiempo real a {} clientes: {}", clientes.size(), tipoEvento);
        List<SseEmitter> clientesMuertos = new CopyOnWriteArrayList<>();

        for (SseEmitter emitter : clientes) {
            try {
                emitter.send(SseEmitter.event()
                        .name("actualizacion")
                        .data(Map.of(
                                "tipo", tipoEvento,
                                "timestamp", System.currentTimeMillis()
                        )));
            } catch (Exception e) {
                clientesMuertos.add(emitter);
            }
        }

        clientes.removeAll(clientesMuertos);
    }
}