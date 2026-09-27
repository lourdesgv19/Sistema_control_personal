package backend.dto;

import java.util.List;

public class MetricasPersonalDTO {

    private Double cargaSemanalHoras;
    private Integer diasConAsistencia;
    private String textoRangoDias;
    private String regimenHorarioDescripcion;
    private String regimenHorarioSubtitulo;
    private Integer toleranciaIngresoMin;
    private Integer toleranciaEgresoMin;
    private List<String> diasActivos;

    public MetricasPersonalDTO() {}

    public MetricasPersonalDTO(Double cargaSemanalHoras, Integer diasConAsistencia, String textoRangoDias,
                               String regimenHorarioDescripcion, String regimenHorarioSubtitulo,
                               Integer toleranciaIngresoMin, Integer toleranciaEgresoMin, List<String> diasActivos) {
        this.cargaSemanalHoras = cargaSemanalHoras;
        this.diasConAsistencia = diasConAsistencia;
        this.textoRangoDias = textoRangoDias;
        this.regimenHorarioDescripcion = regimenHorarioDescripcion;
        this.regimenHorarioSubtitulo = regimenHorarioSubtitulo;
        this.toleranciaIngresoMin = toleranciaIngresoMin;
        this.toleranciaEgresoMin = toleranciaEgresoMin;
        this.diasActivos = diasActivos;
    }

    public Double getCargaSemanalHoras() { return cargaSemanalHoras; }
    public void setCargaSemanalHoras(Double cargaSemanalHoras) { this.cargaSemanalHoras = cargaSemanalHoras; }

    public Integer getDiasConAsistencia() { return diasConAsistencia; }
    public void setDiasConAsistencia(Integer diasConAsistencia) { this.diasConAsistencia = diasConAsistencia; }

    public String getTextoRangoDias() { return textoRangoDias; }
    public void setTextoRangoDias(String textoRangoDias) { this.textoRangoDias = textoRangoDias; }

    public String getRegimenHorarioDescripcion() { return regimenHorarioDescripcion; }
    public void setRegimenHorarioDescripcion(String regimenHorarioDescripcion) { this.regimenHorarioDescripcion = regimenHorarioDescripcion; }

    public String getRegimenHorarioSubtitulo() { return regimenHorarioSubtitulo; }
    public void setRegimenHorarioSubtitulo(String regimenHorarioSubtitulo) { this.regimenHorarioSubtitulo = regimenHorarioSubtitulo; }

    public Integer getToleranciaIngresoMin() { return toleranciaIngresoMin; }
    public void setToleranciaIngresoMin(Integer toleranciaIngresoMin) { this.toleranciaIngresoMin = toleranciaIngresoMin; }

    public Integer getToleranciaEgresoMin() { return toleranciaEgresoMin; }
    public void setToleranciaEgresoMin(Integer toleranciaEgresoMin) { this.toleranciaEgresoMin = toleranciaEgresoMin; }

    public List<String> getDiasActivos() { return diasActivos; }
    public void setDiasActivos(List<String> diasActivos) { this.diasActivos = diasActivos; }
}