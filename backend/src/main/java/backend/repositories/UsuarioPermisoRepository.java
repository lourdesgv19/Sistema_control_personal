package backend.repositories;

import backend.model.UsuarioPermiso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UsuarioPermisoRepository extends JpaRepository<UsuarioPermiso, Long> {

    List<UsuarioPermiso> findByUsuarioId(Long usuarioId);

    // Permisos actualmente activos y vigentes para un usuario
    @Query("""
        SELECT up FROM UsuarioPermiso up 
        WHERE up.usuario.id = :usuarioId 
          AND up.activo = true 
          AND (up.esTemporal = false OR up.fechaExpiracion IS NULL OR up.fechaExpiracion > :ahora)
    """)
    List<UsuarioPermiso> findPermisosVigentes(@Param("usuarioId") Long usuarioId, @Param("ahora") LocalDateTime ahora);

    Optional<UsuarioPermiso> findByUsuarioIdAndCodigoPermiso(Long usuarioId, String codigoPermiso);

    // Desactivación masiva automática de permisos vencidos
    @Modifying
    @Query("""
        UPDATE UsuarioPermiso up 
        SET up.activo = false 
        WHERE up.activo = true 
          AND up.esTemporal = true 
          AND up.fechaExpiracion IS NOT NULL 
          AND up.fechaExpiracion <= :ahora
    """)
    int desactivarPermisosExpirados(@Param("ahora") LocalDateTime ahora);
}