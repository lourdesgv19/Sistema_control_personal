package backend.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class DispositivoEventoDTO {

    private String ipAddress;
    private String portNo;
    private String macAddress;
    private String dateTime; // Formato ISO del terminal
    private String eventType;

    @JsonProperty("AccessControllerEvent")
    private AccessControllerEvent accessControllerEvent;

    public DispositivoEventoDTO() {}

    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getPortNo() { return portNo; }
    public void setPortNo(String portNo) { this.portNo = portNo; }
    public String getMacAddress() { return macAddress; }
    public void setMacAddress(String macAddress) { this.macAddress = macAddress; }
    public String getDateTime() { return dateTime; }
    public void setDateTime(String dateTime) { this.dateTime = dateTime; }
    public String getEventType() { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }
    public AccessControllerEvent getAccessControllerEvent() { return accessControllerEvent; }
    public void setAccessControllerEvent(AccessControllerEvent accessControllerEvent) { 
        this.accessControllerEvent = accessControllerEvent; 
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AccessControllerEvent {
        private String deviceName;
        private String employeeNoString;
        private String name; 
        private String currentVerifyMode;
        private String attendanceStatus;
        private Long serialNo;

        public AccessControllerEvent() {}

        public String getDeviceName() { return deviceName; }
        public void setDeviceName(String deviceName) { this.deviceName = deviceName; }

        public String getEmployeeNoString() { return employeeNoString; }
        public void setEmployeeNoString(String employeeNoString) { this.employeeNoString = employeeNoString; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getCurrentVerifyMode() { return currentVerifyMode; }
        public void setCurrentVerifyMode(String currentVerifyMode) { this.currentVerifyMode = currentVerifyMode; }

        public String getAttendanceStatus() { return attendanceStatus; }
        public void setAttendanceStatus(String attendanceStatus) { this.attendanceStatus = attendanceStatus; }

        public Long getSerialNo() { return serialNo; }
        public void setSerialNo(Long serialNo) { this.serialNo = serialNo; }
    }
}