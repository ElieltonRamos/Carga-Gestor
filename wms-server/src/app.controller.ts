import { Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { Public } from './core/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  async getHello(@Res() res: Response): Promise<void> {
    const data = await this.appService.getDashboardData();
    const html = this.appService.renderDashboard(data);
    res.type('html').send(html);
  }

  @Post('backup')
  @UseGuards(JwtAuthGuard)
  async executeBackup() {
    await this.appService.execBackup();
    return { message: 'Backup executado com sucesso' };
  }
}
