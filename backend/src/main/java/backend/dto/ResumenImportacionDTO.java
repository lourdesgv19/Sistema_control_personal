package backend.dto;

import java.util.List;

public record ResumenImportacionDTO(
    int totalFilas,
    int procesadasOk,
    int duplicadasIgnoradas,
    int errores,
    List<String> mensajesErrores
) {}