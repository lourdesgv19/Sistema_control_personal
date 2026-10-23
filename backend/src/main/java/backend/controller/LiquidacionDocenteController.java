package backend.controller;

import backend.dto.LiquidacionDocenteDTO.*;
import backend.service.LiquidacionDocenteService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/liquidacion-docente")
@CrossOrigin(origins = "*")
public class LiquidacionDocenteController {

    private final LiquidacionDocenteService liquidacionService;

    public LiquidacionDocenteController(LiquidacionDocenteService liquidacionService) {
        this.liquidacionService = liquidacionService;
    }

    @GetMapping
    public ResponseEntity<LiquidacionGlobalDTO> obtenerLiquidacion(
            @RequestParam(required = false, defaultValue = "SEMANAL") String modalidad,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaBase,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer trimestre,
            @RequestParam(required = false) Integer cuatrimestre,
            @RequestParam(required = false) Long idDocente) {

        LiquidacionGlobalDTO dto = liquidacionService.calcularLiquidacion(
                modalidad, fechaBase, fechaDesde, fechaHasta, mes, anio, trimestre, cuatrimestre, idDocente
        );
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/exportar-csv")
    public ResponseEntity<byte[]> exportarCsv(
            @RequestParam(required = false, defaultValue = "SEMANAL") String modalidad,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaBase,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaDesde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaHasta,
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer trimestre,
            @RequestParam(required = false) Integer cuatrimestre,
            @RequestParam(required = false) Long idDocente) {

        LiquidacionGlobalDTO dto = liquidacionService.calcularLiquidacion(
                modalidad, fechaBase, fechaDesde, fechaHasta, mes, anio, trimestre, cuatrimestre, idDocente
        );

        StringBuilder sb = new StringBuilder();
        // Encabezado CSV
        sb.append("Legajo;Docente;DNI;Materia;Aula;Horario;Tarifa_Hora;Horas_Prog;Horas_Dict;Horas_Desc;Pago_Ideal;Pago_Real;Monto_Descontado;Cumplimiento_Porc;Cant_Desvios\n");

        for (DocenteLiquidacionDTO d : dto.docentes()) {
            for (ComisionLiquidacionDTO c : d.comisiones()) {
                sb.append(String.format("%s;\"%s\";%s;\"%s\";\"%s\";\"%s\";%.2f;%.1f;%.1f;%.1f;%.2f;%.2f;%.2f;%d%%;%d\n",
                        d.nroLegajo(),
                        d.nombreDocente(),
                        d.dni(),
                        c.nombreMateria(),
                        c.aula(),
                        c.horarioTexto(),
                        c.tarifaHora(),
                        c.horasProgramadas(),
                        c.horasDictadas(),
                        c.horasDescontadas(),
                        c.pagoIdeal(),
                        c.pagoReal(),
                        c.montoDescontado(),
                        c.porcentajeCumplimiento(),
                        c.cantidadDesvios()
                ));
            }
        }

        byte[] bytes = sb.toString().getBytes(StandardCharsets.ISO_8859_1);
        String filename = "Liquidacion_Docente_" + dto.fechaInicio() + "_" + dto.fechaFin() + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=ISO-8859-1"))
                .body(bytes);
    }
}