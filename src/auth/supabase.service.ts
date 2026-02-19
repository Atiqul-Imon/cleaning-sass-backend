import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabaseAdmin: SupabaseClient | null = null;
  private supabaseAnon: SupabaseClient | null = null;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    // Admin client for server-side operations (token verification)
    if (supabaseUrl && supabaseServiceRoleKey) {
      this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }

    // Anon client for password verification
    if (supabaseUrl && supabaseAnonKey) {
      this.supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
  }

  getAdminClient(): SupabaseClient {
    if (!this.supabaseAdmin) {
      throw new Error('Supabase admin client not initialized');
    }
    return this.supabaseAdmin;
  }

  getAnonClient(): SupabaseClient {
    if (!this.supabaseAnon) {
      throw new Error('Supabase anon client not initialized');
    }
    return this.supabaseAnon;
  }

  async verifyToken(token: string) {
    try {
      if (!this.supabaseAdmin) {
        return null;
      }
      const { data, error } = await this.supabaseAdmin.auth.getUser(token);
      if (error) {
        return null;
      }
      return data.user;
    } catch {
      return null;
    }
  }
}
