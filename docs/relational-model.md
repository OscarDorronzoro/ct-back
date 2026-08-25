# Modelo relacional

El siguiente diagrama representa el modelo físico de datos implementado en una base de datos relacional. Se detallan las principales entidades del sistema, sus atributos y las relaciones establecidas mediante claves primarias y foráneas.

```mermaid
erDiagram

    BREEDS {
        int id PK
        varchar name UK
    }

    COWS {
        int id PK
        int breed_id FK
        int current_collar_id FK
        varchar ear_tag
        varchar alias
        timestamptz birth_date
        text image_url
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    COLLARS {
        int id PK
        varchar firmware_version
        text description
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at
    }

    COW_COLLAR_ASSIGNMENTS {
        int id PK
        int cow_id FK
        int collar_id FK
        timestamptz date_from
        timestamptz date_to
    }

    GROUPS {
        int id PK
        varchar name
        varchar description
    }

    COW_GROUP_MEMBERSHIPS {
        int id PK
        int cow_id FK
        int group_id FK
        timestamptz date_from
        timestamptz date_to
    }

    GATEWAYS {
        int id PK
        varchar description
        varchar api_key_hash UK
        timestamptz revoked_at
        timestamptz created_at
    }

    RAW_RF_MESSAGES {
        bigint id PK
        int invalid_reason_id FK
        int collar_id FK
        timestamptz recorded_at
        geography location
        real altitude
        real speed
        int satellites_count
        real hdop
        real voltage
        real rssi
        real snr
        varchar crc
        int gateway_id
        timestamptz processed_at
        timestamptz created_at
        timestamptz updated_at
    }

    INVALID_REASONS {
        int id PK
        varchar description
    }

    POSITIONS {
        bigint id PK
        int collar_id FK
        int cow_id FK
        bigint raw_rf_message_id FK,UK
        int zone_id FK
        timestamptz recorded_at
        geography location
        real speed
        real accuracy
        real signal_strength
        real distance_to_previous
        timestamptz created_at
        timestamptz updated_at
    }

    ZONE_TYPES {
        int id PK
        varchar name
    }

    ZONES {
        int id PK
        int zone_type_id FK
        varchar name
        text description
        geography polygon
        timestamptz created_at
        timestamptz updated_at
    }

    EVENT_TYPES {
        int id PK
        varchar name
    }

    EVENTS {
        bigint id PK
        int event_type_id FK
        int cow_id FK
        int collar_id FK
        bigint position_id FK
        bigint raw_rf_message_id FK
        int zone_id FK
        timestamptz occurred_at
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }

    USERS {
        int id PK
        varchar username
        varchar password
        timestamptz created_at
        timestamptz updated_at
        int role
    }

    REFRESH_TOKENS {
        int id PK
        int user_id FK
        varchar token_hash UK
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz created_at
    }


    %% Razas
    BREEDS ||--o{ COWS : "breed_id"

    %% Vaca - Collar
    COWS ||--o{ COW_COLLAR_ASSIGNMENTS : "cow_id"
    COLLARS ||--o{ COW_COLLAR_ASSIGNMENTS : "collar_id"

    %% Collar actual de la vaca
    COLLARS ||--o{ COWS : "current_collar_id"

    %% Vaca - Grupo
    COWS ||--o{ COW_GROUP_MEMBERSHIPS : "cow_id"
    GROUPS ||--o{ COW_GROUP_MEMBERSHIPS : "group_id"

    %% RF
    INVALID_REASONS ||--o{ RAW_RF_MESSAGES : "invalid_reason_id"
    COLLARS ||--o{ RAW_RF_MESSAGES : "collar_id"
    GATEWAYS ||--o{ RAW_RF_MESSAGES : "gateway_id"

    %% Posiciones
    COLLARS ||--o{ POSITIONS : "collar_id"
    COWS ||--o{ POSITIONS : "cow_id"
    RAW_RF_MESSAGES ||--o| POSITIONS : "raw_rf_message_id"
    ZONES ||--o{ POSITIONS : "zone_id"

    %% Eventos
    EVENT_TYPES ||--o{ EVENTS : "event_type_id"
    COWS ||--o{ EVENTS : "cow_id"
    COLLARS ||--o{ EVENTS : "collar_id"
    POSITIONS ||--o{ EVENTS : "position_id"
    RAW_RF_MESSAGES ||--o{ EVENTS : "raw_rf_message_id"
    ZONES ||--o{ EVENTS : "zone_id"

    %% Autenticación
    USERS ||--o{ REFRESH_TOKENS : "user_id"

    %% Zonas
    ZONE_TYPES ||--o{ ZONES : "zone_type_id"
```

> **Nota:** Las entidades Zonas y Eventos se encuentran fuera del alcance de esta entrega.
