// ═══════════════════════════════════════════════════════════════════════
// GENERAT AUTOMAT — nu edita manual.
// Sursa: schema publica a proiectului Supabase (migratiile din supabase/migrations).
// Regenerare: npx supabase gen types typescript --project-id <ref> > src/types/database.ts
// ═══════════════════════════════════════════════════════════════════════
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          activ: boolean
          created_at: string
          email: string | null
          id: string
          list_view_columns_config: Json
          nume: string | null
          restaurant_id: string
          rol: Database["public"]["Enums"]["admin_rol"]
          updated_at: string
          user_id: string
        }
        Insert: {
          activ?: boolean
          created_at?: string
          email?: string | null
          id?: string
          list_view_columns_config?: Json
          nume?: string | null
          restaurant_id: string
          rol?: Database["public"]["Enums"]["admin_rol"]
          updated_at?: string
          user_id: string
        }
        Update: {
          activ?: boolean
          created_at?: string
          email?: string | null
          id?: string
          list_view_columns_config?: Json
          nume?: string | null
          restaurant_id?: string
          rol?: Database["public"]["Enums"]["admin_rol"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_users_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          comision_bilete_procent: number
          id: boolean
          maintenance_mode: boolean
          mesaj_mentenanta: string
          pret_plan_pro: number
          pret_plan_start: number
          retentie_ani_default: number
          setup_floor_plan_pret: number
          setup_prag_mese: number
          setup_pret_masa_extra: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          comision_bilete_procent?: number
          id?: boolean
          maintenance_mode?: boolean
          mesaj_mentenanta?: string
          pret_plan_pro?: number
          pret_plan_start?: number
          retentie_ani_default?: number
          setup_floor_plan_pret?: number
          setup_prag_mese?: number
          setup_pret_masa_extra?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          comision_bilete_procent?: number
          id?: boolean
          maintenance_mode?: boolean
          mesaj_mentenanta?: string
          pret_plan_pro?: number
          pret_plan_start?: number
          retentie_ani_default?: number
          setup_floor_plan_pret?: number
          setup_prag_mese?: number
          setup_pret_masa_extra?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_super_admin: {
        Row: {
          actiune: Database["public"]["Enums"]["audit_actiune"]
          created_at: string
          detalii: Json
          efectuat_de: string | null
          email_autor: string | null
          id: string
          restaurant_id: string | null
          restaurant_nume: string | null
        }
        Insert: {
          actiune: Database["public"]["Enums"]["audit_actiune"]
          created_at?: string
          detalii?: Json
          efectuat_de?: string | null
          email_autor?: string | null
          id?: string
          restaurant_id?: string | null
          restaurant_nume?: string | null
        }
        Update: {
          actiune?: Database["public"]["Enums"]["audit_actiune"]
          created_at?: string
          detalii?: Json
          efectuat_de?: string | null
          email_autor?: string | null
          id?: string
          restaurant_id?: string | null
          restaurant_nume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_super_admin_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_super_admin_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_merge_audit: {
        Row: {
          created_at: string
          duplicat_id: string
          efectuat_de: string | null
          id: string
          principal_id: string
          restaurant_id: string
          snapshot_duplicat: Json
        }
        Insert: {
          created_at?: string
          duplicat_id: string
          efectuat_de?: string | null
          id?: string
          principal_id: string
          restaurant_id: string
          snapshot_duplicat: Json
        }
        Update: {
          created_at?: string
          duplicat_id?: string
          efectuat_de?: string | null
          id?: string
          principal_id?: string
          restaurant_id?: string
          snapshot_duplicat?: Json
        }
        Relationships: [
          {
            foreignKeyName: "customer_merge_audit_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_merge_audit_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_merge_audit_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          arhivat: boolean
          created_at: string
          data_ultima_vizita: string | null
          email: string | null
          gdpr_consimtamant: boolean
          id: string
          merged_into_id: string | null
          note: string | null
          nr_no_show: number
          nr_vizite: number
          nume: string | null
          restaurant_id: string
          taguri: string[]
          telefon: string
          updated_at: string
        }
        Insert: {
          arhivat?: boolean
          created_at?: string
          data_ultima_vizita?: string | null
          email?: string | null
          gdpr_consimtamant?: boolean
          id?: string
          merged_into_id?: string | null
          note?: string | null
          nr_no_show?: number
          nr_vizite?: number
          nume?: string | null
          restaurant_id: string
          taguri?: string[]
          telefon: string
          updated_at?: string
        }
        Update: {
          arhivat?: boolean
          created_at?: string
          data_ultima_vizita?: string | null
          email?: string | null
          gdpr_consimtamant?: boolean
          id?: string
          merged_into_id?: string | null
          note?: string | null
          nr_no_show?: number
          nr_vizite?: number
          nume?: string | null
          restaurant_id?: string
          taguri?: string[]
          telefon?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_merged_into_id_fkey"
            columns: ["merged_into_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tables: {
        Row: {
          event_id: string
          table_id: string
        }
        Insert: {
          event_id: string
          table_id: string
        }
        Update: {
          event_id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tables_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenimente_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tables_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tables_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "mese_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tables_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      event_ticket_pricing: {
        Row: {
          event_id: string
          id: string
          masa_forma: Database["public"]["Enums"]["masa_forma"] | null
          pret_eur: number
          zone_id: string | null
        }
        Insert: {
          event_id: string
          id?: string
          masa_forma?: Database["public"]["Enums"]["masa_forma"] | null
          pret_eur: number
          zone_id?: string | null
        }
        Update: {
          event_id?: string
          id?: string
          masa_forma?: Database["public"]["Enums"]["masa_forma"] | null
          pret_eur?: number
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_ticket_pricing_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenimente_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_pricing_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_pricing_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_ticket_pricing_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          afis_url: string | null
          created_at: string
          created_by: string | null
          data_ora: string
          descriere: string | null
          durata_minute: number
          id: string
          nr_no_show_eveniment: number
          nume: string
          popup_activ: boolean
          popup_zile_inainte: number
          restaurant_id: string
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
        }
        Insert: {
          afis_url?: string | null
          created_at?: string
          created_by?: string | null
          data_ora: string
          descriere?: string | null
          durata_minute?: number
          id?: string
          nr_no_show_eveniment?: number
          nume: string
          popup_activ?: boolean
          popup_zile_inainte?: number
          restaurant_id: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Update: {
          afis_url?: string | null
          created_at?: string
          created_by?: string | null
          data_ora?: string
          descriere?: string | null
          durata_minute?: number
          id?: string
          nr_no_show_eveniment?: number
          nume?: string
          popup_activ?: boolean
          popup_zile_inainte?: number
          restaurant_id?: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_layers: {
        Row: {
          actualizat_de: string | null
          blocat: boolean
          continut: Json
          created_at: string
          id: string
          publicat: boolean
          restaurant_id: string
          tip: Database["public"]["Enums"]["layer_tip"]
          updated_at: string
          versiune: number
          vizibil: boolean
          zone_id: string
        }
        Insert: {
          actualizat_de?: string | null
          blocat?: boolean
          continut?: Json
          created_at?: string
          id?: string
          publicat?: boolean
          restaurant_id: string
          tip: Database["public"]["Enums"]["layer_tip"]
          updated_at?: string
          versiune?: number
          vizibil?: boolean
          zone_id: string
        }
        Update: {
          actualizat_de?: string | null
          blocat?: boolean
          continut?: Json
          created_at?: string
          id?: string
          publicat?: boolean
          restaurant_id?: string
          tip?: Database["public"]["Enums"]["layer_tip"]
          updated_at?: string
          versiune?: number
          vizibil?: boolean
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_layers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_layers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_layers_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_layers_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_projects: {
        Row: {
          continut: Json | null
          created_at: string
          created_by: string | null
          id: string
          nume: string
          parinte_id: string | null
          publicat_de: string | null
          publicat_la: string | null
          restaurant_id: string | null
          status: Database["public"]["Enums"]["fp_project_status"] | null
          tip: Database["public"]["Enums"]["fp_nod_tip"]
          updated_at: string
          versiune: number
          zone_id: string | null
        }
        Insert: {
          continut?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          nume: string
          parinte_id?: string | null
          publicat_de?: string | null
          publicat_la?: string | null
          restaurant_id?: string | null
          status?: Database["public"]["Enums"]["fp_project_status"] | null
          tip: Database["public"]["Enums"]["fp_nod_tip"]
          updated_at?: string
          versiune?: number
          zone_id?: string | null
        }
        Update: {
          continut?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          nume?: string
          parinte_id?: string | null
          publicat_de?: string | null
          publicat_la?: string | null
          restaurant_id?: string | null
          status?: Database["public"]["Enums"]["fp_project_status"] | null
          tip?: Database["public"]["Enums"]["fp_nod_tip"]
          updated_at?: string
          versiune?: number
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_projects_parinte_id_fkey"
            columns: ["parinte_id"]
            isOneToOne: false
            referencedRelation: "floor_plan_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_projects_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_projects_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_projects_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_projects_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      floor_plan_requests: {
        Row: {
          ai_generat_la: string | null
          ai_rezultat: Json | null
          assigned_to: string | null
          created_at: string
          descriere: string | null
          id: string
          procesat_de: string | null
          restaurant_id: string
          schita_image_url: string | null
          status: Database["public"]["Enums"]["fp_request_status"]
          updated_at: string
          zone_nume: string
        }
        Insert: {
          ai_generat_la?: string | null
          ai_rezultat?: Json | null
          assigned_to?: string | null
          created_at?: string
          descriere?: string | null
          id?: string
          procesat_de?: string | null
          restaurant_id: string
          schita_image_url?: string | null
          status?: Database["public"]["Enums"]["fp_request_status"]
          updated_at?: string
          zone_nume: string
        }
        Update: {
          ai_generat_la?: string | null
          ai_rezultat?: Json | null
          assigned_to?: string | null
          created_at?: string
          descriere?: string | null
          id?: string
          procesat_de?: string | null
          restaurant_id?: string
          schita_image_url?: string | null
          status?: Database["public"]["Enums"]["fp_request_status"]
          updated_at?: string
          zone_nume?: string
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "super_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_requests_procesat_de_fkey"
            columns: ["procesat_de"]
            isOneToOne: false
            referencedRelation: "super_admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_requests_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_requests_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      formular_campuri: {
        Row: {
          activ: boolean
          cheie: string
          created_at: string
          eticheta: string
          id: string
          obligatoriu: boolean
          optiuni: Json
          ordine: number
          placeholder: string | null
          restaurant_id: string
          sistem: boolean
          tip: Database["public"]["Enums"]["camp_formular_tip"]
          updated_at: string
        }
        Insert: {
          activ?: boolean
          cheie: string
          created_at?: string
          eticheta: string
          id?: string
          obligatoriu?: boolean
          optiuni?: Json
          ordine?: number
          placeholder?: string | null
          restaurant_id: string
          sistem?: boolean
          tip?: Database["public"]["Enums"]["camp_formular_tip"]
          updated_at?: string
        }
        Update: {
          activ?: boolean
          cheie?: string
          created_at?: string
          eticheta?: string
          id?: string
          obligatoriu?: boolean
          optiuni?: Json
          ordine?: number
          placeholder?: string | null
          restaurant_id?: string
          sistem?: boolean
          tip?: Database["public"]["Enums"]["camp_formular_tip"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formular_campuri_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formular_campuri_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      notificari: {
        Row: {
          citita_la: string | null
          created_at: string
          destinatie: Database["public"]["Enums"]["notificare_destinatie"]
          id: string
          mesaj: string | null
          reservation_id: string | null
          restaurant_id: string | null
          tip: Database["public"]["Enums"]["notificare_tip"]
          titlu: string
          urgenta: Database["public"]["Enums"]["notificare_urgenta"]
        }
        Insert: {
          citita_la?: string | null
          created_at?: string
          destinatie?: Database["public"]["Enums"]["notificare_destinatie"]
          id?: string
          mesaj?: string | null
          reservation_id?: string | null
          restaurant_id?: string | null
          tip: Database["public"]["Enums"]["notificare_tip"]
          titlu: string
          urgenta?: Database["public"]["Enums"]["notificare_urgenta"]
        }
        Update: {
          citita_la?: string | null
          created_at?: string
          destinatie?: Database["public"]["Enums"]["notificare_destinatie"]
          id?: string
          mesaj?: string | null
          reservation_id?: string | null
          restaurant_id?: string | null
          tip?: Database["public"]["Enums"]["notificare_tip"]
          titlu?: string
          urgenta?: Database["public"]["Enums"]["notificare_urgenta"]
        }
        Relationships: [
          {
            foreignKeyName: "notificari_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificari_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificari_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exceptii: {
        Row: {
          created_at: string
          data: string
          id: string
          inchis: boolean
          motiv: string | null
          ora_deschidere: string | null
          ora_inchidere: string | null
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          inchis?: boolean
          motiv?: string | null
          ora_deschidere?: string | null
          ora_inchidere?: string | null
          restaurant_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          inchis?: boolean
          motiv?: string | null
          ora_deschidere?: string | null
          ora_inchidere?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_exceptii_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_exceptii_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          anonimizat_la: string | null
          blocat_pana_la: string
          buffer_minute: number
          campuri_custom: Json
          client_nume: string
          client_prenume: string | null
          creat_de: string | null
          created_at: string
          customer_id: string | null
          data_ora: string
          durata_minute: number
          email: string | null
          event_id: string | null
          gdpr_consimtamant: boolean
          id: string
          note_client: string | null
          note_interne: string | null
          nr_persoane: number
          restaurant_id: string
          se_termina_la: string
          sosit_la: string | null
          status: Database["public"]["Enums"]["rezervare_status"]
          sursa: Database["public"]["Enums"]["rezervare_sursa"]
          table_id: string | null
          telefon: string | null
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          anonimizat_la?: string | null
          blocat_pana_la: string
          buffer_minute: number
          campuri_custom?: Json
          client_nume: string
          client_prenume?: string | null
          creat_de?: string | null
          created_at?: string
          customer_id?: string | null
          data_ora: string
          durata_minute: number
          email?: string | null
          event_id?: string | null
          gdpr_consimtamant?: boolean
          id?: string
          note_client?: string | null
          note_interne?: string | null
          nr_persoane: number
          restaurant_id: string
          se_termina_la: string
          sosit_la?: string | null
          status?: Database["public"]["Enums"]["rezervare_status"]
          sursa?: Database["public"]["Enums"]["rezervare_sursa"]
          table_id?: string | null
          telefon?: string | null
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          anonimizat_la?: string | null
          blocat_pana_la?: string
          buffer_minute?: number
          campuri_custom?: Json
          client_nume?: string
          client_prenume?: string | null
          creat_de?: string | null
          created_at?: string
          customer_id?: string | null
          data_ora?: string
          durata_minute?: number
          email?: string | null
          event_id?: string | null
          gdpr_consimtamant?: boolean
          id?: string
          note_client?: string | null
          note_interne?: string | null
          nr_persoane?: number
          restaurant_id?: string
          se_termina_la?: string
          sosit_la?: string | null
          status?: Database["public"]["Enums"]["rezervare_status"]
          sursa?: Database["public"]["Enums"]["rezervare_sursa"]
          table_id?: string | null
          telefon?: string | null
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenimente_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "mese_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          adresa: string | null
          aprobare_automata: boolean
          buffer_minute: number
          created_at: string
          cui: string | null
          culoare_accent: string
          data_retentie_ani: number
          discount_procent: number | null
          durata_implicita_minute: number
          email_contact: string | null
          floor_plan_deblocat_manual: boolean
          fus_orar: string
          id: string
          logo_url: string | null
          max_scaune_masa: number
          motiv_suspendare: string | null
          nume: string
          nume_firma: string | null
          oras: string | null
          persoana_contact: string | null
          plan: Database["public"]["Enums"]["plan_tip"]
          program_standard: Json
          setup_floor_plan_platit: boolean
          slug: string
          status: Database["public"]["Enums"]["restaurant_status"]
          suspendat_la: string | null
          telefon_contact: string | null
          tip_locatie: string | null
          trial_extins_pana_la: string | null
          updated_at: string
        }
        Insert: {
          adresa?: string | null
          aprobare_automata?: boolean
          buffer_minute?: number
          created_at?: string
          cui?: string | null
          culoare_accent?: string
          data_retentie_ani?: number
          discount_procent?: number | null
          durata_implicita_minute?: number
          email_contact?: string | null
          floor_plan_deblocat_manual?: boolean
          fus_orar?: string
          id?: string
          logo_url?: string | null
          max_scaune_masa?: number
          motiv_suspendare?: string | null
          nume: string
          nume_firma?: string | null
          oras?: string | null
          persoana_contact?: string | null
          plan?: Database["public"]["Enums"]["plan_tip"]
          program_standard?: Json
          setup_floor_plan_platit?: boolean
          slug: string
          status?: Database["public"]["Enums"]["restaurant_status"]
          suspendat_la?: string | null
          telefon_contact?: string | null
          tip_locatie?: string | null
          trial_extins_pana_la?: string | null
          updated_at?: string
        }
        Update: {
          adresa?: string | null
          aprobare_automata?: boolean
          buffer_minute?: number
          created_at?: string
          cui?: string | null
          culoare_accent?: string
          data_retentie_ani?: number
          discount_procent?: number | null
          durata_implicita_minute?: number
          email_contact?: string | null
          floor_plan_deblocat_manual?: boolean
          fus_orar?: string
          id?: string
          logo_url?: string | null
          max_scaune_masa?: number
          motiv_suspendare?: string | null
          nume?: string
          nume_firma?: string | null
          oras?: string | null
          persoana_contact?: string | null
          plan?: Database["public"]["Enums"]["plan_tip"]
          program_standard?: Json
          setup_floor_plan_platit?: boolean
          slug?: string
          status?: Database["public"]["Enums"]["restaurant_status"]
          suspendat_la?: string | null
          telefon_contact?: string | null
          tip_locatie?: string | null
          trial_extins_pana_la?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      slug_rezervate: {
        Row: {
          slug: string
        }
        Insert: {
          slug: string
        }
        Update: {
          slug?: string
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          acceptata_la: string | null
          created_at: string
          email: string
          expira_la: string
          id: string
          invited_by: string | null
          restaurant_id: string
          rol: Database["public"]["Enums"]["admin_rol"]
          status: Database["public"]["Enums"]["invitatie_status"]
          token: string
        }
        Insert: {
          acceptata_la?: string | null
          created_at?: string
          email: string
          expira_la?: string
          id?: string
          invited_by?: string | null
          restaurant_id: string
          rol?: Database["public"]["Enums"]["admin_rol"]
          status?: Database["public"]["Enums"]["invitatie_status"]
          token?: string
        }
        Update: {
          acceptata_la?: string | null
          created_at?: string
          email?: string
          expira_la?: string
          id?: string
          invited_by?: string | null
          restaurant_id?: string
          rol?: Database["public"]["Enums"]["admin_rol"]
          status?: Database["public"]["Enums"]["invitatie_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_invitations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      statusuri_servicii: {
        Row: {
          detaliu: string | null
          serviciu: Database["public"]["Enums"]["serviciu_extern"]
          status: Database["public"]["Enums"]["serviciu_status"]
          verificat_la: string
        }
        Insert: {
          detaliu?: string | null
          serviciu: Database["public"]["Enums"]["serviciu_extern"]
          status?: Database["public"]["Enums"]["serviciu_status"]
          verificat_la?: string
        }
        Update: {
          detaliu?: string | null
          serviciu?: Database["public"]["Enums"]["serviciu_extern"]
          status?: Database["public"]["Enums"]["serviciu_status"]
          verificat_la?: string
        }
        Relationships: []
      }
      super_admin_invitations: {
        Row: {
          acceptata_la: string | null
          created_at: string
          email: string
          expira_la: string
          id: string
          invited_by: string | null
          rol: Database["public"]["Enums"]["super_admin_rol"]
          status: Database["public"]["Enums"]["invitatie_status"]
          token: string
        }
        Insert: {
          acceptata_la?: string | null
          created_at?: string
          email: string
          expira_la?: string
          id?: string
          invited_by?: string | null
          rol: Database["public"]["Enums"]["super_admin_rol"]
          status?: Database["public"]["Enums"]["invitatie_status"]
          token?: string
        }
        Update: {
          acceptata_la?: string | null
          created_at?: string
          email?: string
          expira_la?: string
          id?: string
          invited_by?: string | null
          rol?: Database["public"]["Enums"]["super_admin_rol"]
          status?: Database["public"]["Enums"]["invitatie_status"]
          token?: string
        }
        Relationships: []
      }
      super_admin_users: {
        Row: {
          activ: boolean
          created_at: string
          email: string | null
          id: string
          nume: string | null
          rol: Database["public"]["Enums"]["super_admin_rol"]
          updated_at: string
          user_id: string
        }
        Insert: {
          activ?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nume?: string | null
          rol?: Database["public"]["Enums"]["super_admin_rol"]
          updated_at?: string
          user_id: string
        }
        Update: {
          activ?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nume?: string | null
          rol?: Database["public"]["Enums"]["super_admin_rol"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_response_templates: {
        Row: {
          continut: string
          created_at: string
          id: string
          super_admin_user_id: string | null
          titlu: string
        }
        Insert: {
          continut: string
          created_at?: string
          id?: string
          super_admin_user_id?: string | null
          titlu: string
        }
        Update: {
          continut?: string
          created_at?: string
          id?: string
          super_admin_user_id?: string | null
          titlu?: string
        }
        Relationships: []
      }
      support_ticket_mesaje: {
        Row: {
          autor: string | null
          continut: string
          created_at: string
          de_la_echipa: boolean
          id: string
          nota_interna: boolean
          ticket_id: string
        }
        Insert: {
          autor?: string | null
          continut: string
          created_at?: string
          de_la_echipa?: boolean
          id?: string
          nota_interna?: boolean
          ticket_id: string
        }
        Update: {
          autor?: string | null
          continut?: string
          created_at?: string
          de_la_echipa?: boolean
          id?: string
          nota_interna?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_mesaje_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          deschis_de: string | null
          id: string
          prioritate: Database["public"]["Enums"]["support_prioritate"]
          restaurant_id: string
          status: Database["public"]["Enums"]["support_status"]
          subiect: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deschis_de?: string | null
          id?: string
          prioritate?: Database["public"]["Enums"]["support_prioritate"]
          restaurant_id: string
          status?: Database["public"]["Enums"]["support_status"]
          subiect: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deschis_de?: string | null
          id?: string
          prioritate?: Database["public"]["Enums"]["support_prioritate"]
          restaurant_id?: string
          status?: Database["public"]["Enums"]["support_status"]
          subiect?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      table_allocations: {
        Row: {
          created_at: string
          id: string
          interval_blocat: unknown
          reservation_id: string | null
          restaurant_id: string
          table_id: string
          ticket_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          interval_blocat: unknown
          reservation_id?: string | null
          restaurant_id: string
          table_id: string
          ticket_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          interval_blocat?: unknown
          reservation_id?: string | null
          restaurant_id?: string
          table_id?: string
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_allocations_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_allocations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_allocations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_allocations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "mese_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_allocations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_allocations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          activa: boolean
          capacitate: number
          created_at: string
          forma: Database["public"]["Enums"]["masa_forma"]
          grup_unire_id: string | null
          id: string
          inaltime: number
          indisponibila: boolean
          latime: number
          numar_masa: string
          pozitie_x: number
          pozitie_y: number
          restaurant_id: string
          rotatie: number
          updated_at: string
          zone_id: string
        }
        Insert: {
          activa?: boolean
          capacitate?: number
          created_at?: string
          forma?: Database["public"]["Enums"]["masa_forma"]
          grup_unire_id?: string | null
          id?: string
          inaltime?: number
          indisponibila?: boolean
          latime?: number
          numar_masa: string
          pozitie_x?: number
          pozitie_y?: number
          restaurant_id: string
          rotatie?: number
          updated_at?: string
          zone_id: string
        }
        Update: {
          activa?: boolean
          capacitate?: number
          created_at?: string
          forma?: Database["public"]["Enums"]["masa_forma"]
          grup_unire_id?: string | null
          id?: string
          inaltime?: number
          indisponibila?: boolean
          latime?: number
          numar_masa?: string
          pozitie_x?: number
          pozitie_y?: number
          restaurant_id?: string
          rotatie?: number
          updated_at?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          client_nume: string
          cod: string
          comision_eur: number
          created_at: string
          email: string | null
          event_id: string
          id: string
          nr_persoane: number
          platit_la: string | null
          pret_eur: number
          restaurant_id: string
          scanat_la: string | null
          status_plata: Database["public"]["Enums"]["ticket_plata_status"]
          table_id: string | null
          telefon: string | null
          updated_at: string
        }
        Insert: {
          client_nume: string
          cod?: string
          comision_eur?: number
          created_at?: string
          email?: string | null
          event_id: string
          id?: string
          nr_persoane?: number
          platit_la?: string | null
          pret_eur?: number
          restaurant_id: string
          scanat_la?: string | null
          status_plata?: Database["public"]["Enums"]["ticket_plata_status"]
          table_id?: string | null
          telefon?: string | null
          updated_at?: string
        }
        Update: {
          client_nume?: string
          cod?: string
          comision_eur?: number
          created_at?: string
          email?: string | null
          event_id?: string
          id?: string
          nr_persoane?: number
          platit_la?: string | null
          pret_eur?: number
          restaurant_id?: string
          scanat_la?: string | null
          status_plata?: Database["public"]["Enums"]["ticket_plata_status"]
          table_id?: string | null
          telefon?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "evenimente_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "mese_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          asezat_la: string | null
          created_at: string
          id: string
          nr_persoane: number
          nume: string
          pozitie: number
          restaurant_id: string
          status: Database["public"]["Enums"]["waitlist_status"]
          table_id: string | null
          telefon: string | null
          timp_asteptare_estimat_min: number | null
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          asezat_la?: string | null
          created_at?: string
          id?: string
          nr_persoane: number
          nume: string
          pozitie?: number
          restaurant_id: string
          status?: Database["public"]["Enums"]["waitlist_status"]
          table_id?: string | null
          telefon?: string | null
          timp_asteptare_estimat_min?: number | null
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          asezat_la?: string | null
          created_at?: string
          id?: string
          nr_persoane?: number
          nume?: string
          pozitie?: number
          restaurant_id?: string
          status?: Database["public"]["Enums"]["waitlist_status"]
          table_id?: string | null
          telefon?: string | null
          timp_asteptare_estimat_min?: number | null
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "mese_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_credit_packages: {
        Row: {
          activ: boolean
          credite: number
          id: string
          nume: string
          ordine: number
          pret_eur: number
        }
        Insert: {
          activ?: boolean
          credite: number
          id?: string
          nume: string
          ordine?: number
          pret_eur: number
        }
        Update: {
          activ?: boolean
          credite?: number
          id?: string
          nume?: string
          ordine?: number
          pret_eur?: number
        }
        Relationships: []
      }
      whatsapp_mesaje: {
        Row: {
          continut: string | null
          created_at: string
          eroare: string | null
          id: string
          reservation_id: string | null
          restaurant_id: string
          sablon: string
          status: Database["public"]["Enums"]["wa_mesaj_status"]
          telefon: string
        }
        Insert: {
          continut?: string | null
          created_at?: string
          eroare?: string | null
          id?: string
          reservation_id?: string | null
          restaurant_id: string
          sablon: string
          status?: Database["public"]["Enums"]["wa_mesaj_status"]
          telefon: string
        }
        Update: {
          continut?: string | null
          created_at?: string
          eroare?: string | null
          id?: string
          reservation_id?: string | null
          restaurant_id?: string
          sablon?: string
          status?: Database["public"]["Enums"]["wa_mesaj_status"]
          telefon?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_mesaje_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mesaje_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_mesaje_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          continut: string
          created_at: string
          created_by: string | null
          id: string
          nume: string
        }
        Insert: {
          continut: string
          created_at?: string
          created_by?: string | null
          id?: string
          nume: string
        }
        Update: {
          continut?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nume?: string
        }
        Relationships: []
      }
      whatsapp_tranzactii: {
        Row: {
          created_at: string
          credite: number
          descriere: string | null
          id: string
          pret_eur: number | null
          restaurant_id: string
          tip: Database["public"]["Enums"]["wallet_tranzactie_tip"]
        }
        Insert: {
          created_at?: string
          credite: number
          descriere?: string | null
          id?: string
          pret_eur?: number | null
          restaurant_id: string
          tip: Database["public"]["Enums"]["wallet_tranzactie_tip"]
        }
        Update: {
          created_at?: string
          credite?: number
          descriere?: string | null
          id?: string
          pret_eur?: number | null
          restaurant_id?: string
          tip?: Database["public"]["Enums"]["wallet_tranzactie_tip"]
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_tranzactii_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_tranzactii_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          activa: boolean
          canvas_inaltime: number
          canvas_latime: number
          created_at: string
          grid_marime: number
          id: string
          nume: string
          ordine_afisare: number
          restaurant_id: string
          schita_url: string | null
          updated_at: string
          zoom_implicit: number
        }
        Insert: {
          activa?: boolean
          canvas_inaltime?: number
          canvas_latime?: number
          created_at?: string
          grid_marime?: number
          id?: string
          nume: string
          ordine_afisare?: number
          restaurant_id: string
          schita_url?: string | null
          updated_at?: string
          zoom_implicit?: number
        }
        Update: {
          activa?: boolean
          canvas_inaltime?: number
          canvas_latime?: number
          created_at?: string
          grid_marime?: number
          id?: string
          nume?: string
          ordine_afisare?: number
          restaurant_id?: string
          schita_url?: string | null
          updated_at?: string
          zoom_implicit?: number
        }
        Relationships: [
          {
            foreignKeyName: "zones_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zones_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      campuri_formular_publice: {
        Row: {
          cheie: string | null
          eticheta: string | null
          obligatoriu: boolean | null
          optiuni: Json | null
          ordine: number | null
          placeholder: string | null
          restaurant_id: string | null
          tip: Database["public"]["Enums"]["camp_formular_tip"] | null
        }
        Relationships: [
          {
            foreignKeyName: "formular_campuri_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formular_campuri_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      evenimente_publice: {
        Row: {
          afis_url: string | null
          data_ora: string | null
          descriere: string | null
          id: string | null
          nume: string | null
          pret_de_la: number | null
          restaurant_id: string | null
          slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      mese_publice: {
        Row: {
          capacitate: number | null
          forma: Database["public"]["Enums"]["masa_forma"] | null
          grup_unire_id: string | null
          id: string | null
          inaltime: number | null
          latime: number | null
          numar_masa: string | null
          pozitie_x: number | null
          pozitie_y: number | null
          restaurant_id: string | null
          rotatie: number | null
          zone_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tables_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurante_indisponibile: {
        Row: {
          slug: string | null
        }
        Insert: {
          slug?: string | null
        }
        Update: {
          slug?: string | null
        }
        Relationships: []
      }
      restaurante_publice: {
        Row: {
          aprobare_automata: boolean | null
          culoare_accent: string | null
          durata_implicita_minute: number | null
          fus_orar: string | null
          id: string | null
          logo_url: string | null
          max_scaune_masa: number | null
          nume: string | null
          oras: string | null
          program_standard: Json | null
          slug: string | null
          tip_locatie: string | null
        }
        Insert: {
          aprobare_automata?: boolean | null
          culoare_accent?: string | null
          durata_implicita_minute?: number | null
          fus_orar?: string | null
          id?: string | null
          logo_url?: string | null
          max_scaune_masa?: number | null
          nume?: string | null
          oras?: string | null
          program_standard?: Json | null
          slug?: string | null
          tip_locatie?: string | null
        }
        Update: {
          aprobare_automata?: boolean | null
          culoare_accent?: string | null
          durata_implicita_minute?: number | null
          fus_orar?: string | null
          id?: string | null
          logo_url?: string | null
          max_scaune_masa?: number | null
          nume?: string | null
          oras?: string | null
          program_standard?: Json | null
          slug?: string | null
          tip_locatie?: string | null
        }
        Relationships: []
      }
      structura_publica: {
        Row: {
          continut: Json | null
          restaurant_id: string | null
          zone_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "floor_plan_layers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_layers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_layers_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zone_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "floor_plan_layers_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_publice: {
        Row: {
          canvas_inaltime: number | null
          canvas_latime: number | null
          grid_marime: number | null
          id: string | null
          nume: string | null
          ordine_afisare: number | null
          restaurant_id: string | null
          zoom_implicit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "zones_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurante_publice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zones_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accepta_invitatie: { Args: { p_token: string }; Returns: string }
      anonimizeaza_client: { Args: { p_customer_id: string }; Returns: number }
      anunta_credite_epuizate: {
        Args: { p_restaurant_id: string }
        Returns: undefined
      }
      anunta_mese_in_expirare: { Args: never; Returns: number }
      are_floor_plan: { Args: never; Returns: boolean }
      capacitate_eveniment: { Args: { p_event_id: string }; Returns: number }
      consuma_credit: {
        Args: {
          p_continut?: string
          p_reservation_id?: string
          p_sablon: string
          p_telefon: string
        }
        Returns: boolean
      }
      consuma_credit_intern: {
        Args: {
          p_continut?: string
          p_reservation_id?: string
          p_restaurant_id: string
          p_sablon: string
          p_telefon: string
        }
        Returns: boolean
      }
      contopeste_clienti: {
        Args: { p_duplicat_id: string; p_principal_id: string }
        Returns: number
      }
      credite_whatsapp: { Args: { p_restaurant_id?: string }; Returns: number }
      creeaza_restaurant: {
        Args: {
          p_adresa?: string
          p_cui?: string
          p_nume: string
          p_nume_firma?: string
          p_nume_persoana?: string
          p_oras?: string
          p_plan?: Database["public"]["Enums"]["plan_tip"]
          p_slug: string
          p_telefon?: string
          p_tip_locatie?: string
        }
        Returns: string
      }
      creeaza_rezervare: {
        Args: {
          p_client_nume: string
          p_data_ora: string
          p_durata_minute?: number
          p_email?: string
          p_gdpr?: boolean
          p_note_client?: string
          p_note_interne?: string
          p_nr_persoane: number
          p_status?: Database["public"]["Enums"]["rezervare_status"]
          p_sursa?: Database["public"]["Enums"]["rezervare_sursa"]
          p_table_id?: string
          p_telefon: string
          p_zone_id?: string
        }
        Returns: string
      }
      current_restaurant_id: { Args: never; Returns: string }
      desparte_grup: { Args: { p_grup_id: string }; Returns: number }
      detalii_invitatie: {
        Args: { p_token: string }
        Returns: {
          email: string
          expira_la: string
          restaurant_nume: string
          rol: string
          tip: string
        }[]
      }
      disponibilitate_mese: {
        Args: {
          p_durata_minute?: number
          p_restaurant_id: string
          p_start: string
          p_zone_id: string
        }
        Returns: {
          capacitate: number
          libera: boolean
          numar_masa: string
          table_id: string
        }[]
      }
      este_deschis: {
        Args: { p_instant: string; p_restaurant_id: string }
        Returns: boolean
      }
      is_echipa_studio: { Args: never; Returns: boolean }
      is_echipa_suport: { Args: never; Returns: boolean }
      is_manager: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_super_admin_deplin: { Args: never; Returns: boolean }
      kpi_zi: {
        Args: { p_zi?: string }
        Returns: {
          mese_ocupate: number
          mese_total: number
          no_show_7_zile: number
          pending_nerezolvate: number
          persoane_azi: number
          rezervari_azi: number
        }[]
      }
      mese_libere_pentru_rezervare: {
        Args: {
          p_durata_minute?: number
          p_reservation_id: string
          p_start?: string
          p_zone_id?: string
        }
        Returns: {
          capacitate: number
          libera: boolean
          numar_masa: string
          table_id: string
        }[]
      }
      reincarca_credite: { Args: { p_package_id: string }; Returns: number }
      restaurantul_contului: { Args: never; Returns: string }
      restaureaza_versiune_plan: {
        Args: { p_project_id: string }
        Returns: number
      }
      rezerva_public: {
        Args: {
          p_campuri_custom?: Json
          p_client_nume: string
          p_data_ora: string
          p_email?: string
          p_gdpr?: boolean
          p_note_client?: string
          p_nr_persoane: number
          p_slug: string
          p_telefon: string
          p_zone_id?: string
        }
        Returns: Json
      }
      ruleaza_retentia_gdpr: { Args: never; Returns: number }
      slug_disponibil: { Args: { p_slug: string }; Returns: boolean }
      trimite_remindere_whatsapp: { Args: never; Returns: number }
      uneste_mese: { Args: { p_table_ids: string[] }; Returns: string }
      verifica_conflicte_buffer: {
        Args: { p_buffer_nou: number; p_restaurant_id: string }
        Returns: {
          rezervare_a: string
          rezervare_b: string
          suprapunere: string
          table_id: string
        }[]
      }
      verifica_sanatate_servicii: {
        Args: never
        Returns: {
          detaliu: string | null
          serviciu: Database["public"]["Enums"]["serviciu_extern"]
          status: Database["public"]["Enums"]["serviciu_status"]
          verificat_la: string
        }[]
        SetofOptions: {
          from: "*"
          to: "statusuri_servicii"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      verifica_secret_webhook: { Args: { p_secret: string }; Returns: boolean }
    }
    Enums: {
      admin_rol: "manager" | "ospatar"
      audit_actiune:
        | "suspend"
        | "unsuspend"
        | "ban"
        | "extend_trial"
        | "discount"
        | "manual_floor_plan_unlock"
        | "schimbare_plan"
        | "nota"
        | "schimbare_preturi"
        | "maintenance_toggle"
      camp_formular_tip: "text" | "checkbox" | "dropdown" | "numar"
      event_status: "draft" | "publicat" | "anulat" | "incheiat"
      fp_nod_tip: "folder" | "fisier"
      fp_project_status: "draft" | "published" | "arhivat"
      fp_request_status: "pending" | "in_progress" | "published" | "respins"
      invitatie_status: "trimisa" | "acceptata" | "expirata" | "anulata"
      layer_tip: "layer1" | "layer2"
      masa_forma: "rotunda" | "patrata" | "dreptunghiulara"
      notificare_destinatie: "admin" | "super_admin"
      notificare_tip:
        | "rezervare_noua"
        | "rezervare_pending"
        | "masa_expirare"
        | "credite_epuizate"
        | "floor_plan_status"
        | "floor_plan_request"
        | "conflict_layer"
        | "ticket_suport"
        | "sistem"
      notificare_urgenta: "rosu" | "galben" | "albastru"
      plan_tip: "start" | "pro_floor"
      restaurant_status: "activ" | "suspendat" | "banat"
      rezervare_status:
        | "pending"
        | "confirmata"
        | "sosita"
        | "anulata"
        | "no_show"
        | "respinsa"
      rezervare_sursa: "widget" | "manual" | "walk_in" | "telefon"
      serviciu_extern: "supabase" | "stripe" | "meta_whatsapp"
      serviciu_status: "ok" | "degradat" | "indisponibil"
      super_admin_rol: "super_admin" | "designer_architect" | "support"
      support_prioritate: "normal" | "nou" | "urgent"
      support_status: "nou" | "deschis" | "in_lucru" | "rezolvat" | "inchis"
      ticket_plata_status: "neplatit" | "platit" | "rambursat" | "anulat"
      wa_mesaj_status: "trimis" | "esuat" | "fara_credite" | "simulat"
      waitlist_status: "asteptare" | "asezat" | "plecat"
      wallet_tranzactie_tip:
        | "reincarcare"
        | "consum"
        | "ajustare_manuala"
        | "rambursare"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_rol: ["manager", "ospatar"],
      audit_actiune: [
        "suspend",
        "unsuspend",
        "ban",
        "extend_trial",
        "discount",
        "manual_floor_plan_unlock",
        "schimbare_plan",
        "nota",
        "schimbare_preturi",
        "maintenance_toggle",
      ],
      camp_formular_tip: ["text", "checkbox", "dropdown", "numar"],
      event_status: ["draft", "publicat", "anulat", "incheiat"],
      fp_nod_tip: ["folder", "fisier"],
      fp_project_status: ["draft", "published", "arhivat"],
      fp_request_status: ["pending", "in_progress", "published", "respins"],
      invitatie_status: ["trimisa", "acceptata", "expirata", "anulata"],
      layer_tip: ["layer1", "layer2"],
      masa_forma: ["rotunda", "patrata", "dreptunghiulara"],
      notificare_destinatie: ["admin", "super_admin"],
      notificare_tip: [
        "rezervare_noua",
        "rezervare_pending",
        "masa_expirare",
        "credite_epuizate",
        "floor_plan_status",
        "floor_plan_request",
        "conflict_layer",
        "ticket_suport",
        "sistem",
      ],
      notificare_urgenta: ["rosu", "galben", "albastru"],
      plan_tip: ["start", "pro_floor"],
      restaurant_status: ["activ", "suspendat", "banat"],
      rezervare_status: [
        "pending",
        "confirmata",
        "sosita",
        "anulata",
        "no_show",
        "respinsa",
      ],
      rezervare_sursa: ["widget", "manual", "walk_in", "telefon"],
      serviciu_extern: ["supabase", "stripe", "meta_whatsapp"],
      serviciu_status: ["ok", "degradat", "indisponibil"],
      super_admin_rol: ["super_admin", "designer_architect", "support"],
      support_prioritate: ["normal", "nou", "urgent"],
      support_status: ["nou", "deschis", "in_lucru", "rezolvat", "inchis"],
      ticket_plata_status: ["neplatit", "platit", "rambursat", "anulat"],
      wa_mesaj_status: ["trimis", "esuat", "fara_credite", "simulat"],
      waitlist_status: ["asteptare", "asezat", "plecat"],
      wallet_tranzactie_tip: [
        "reincarcare",
        "consum",
        "ajustare_manuala",
        "rambursare",
      ],
    },
  },
} as const
