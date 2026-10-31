import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { UsersModule } from './features/users/users.module';
import { LicenseSystemModule } from './features/license-system/license-system.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { CompanyModule } from './features/company/company.module';
import { ClientsModule } from './features/clients/clients.module';
import { CargosModule } from './features/cargos/cargos.module';
import { ScanModule } from './features/scan/scan.module';
import { SummaryModule } from './features/summary/summary.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public', 'dist', 'wms-app', 'browser'),
      exclude: ['/api/{*splat}', '/swagger/{*splat}'],
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '12h' },
    }),
    UsersModule,
    LicenseSystemModule,
    CompanyModule,
    ClientsModule,
    CargosModule,
    ScanModule,
    SummaryModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
