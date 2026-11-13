import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { DriversService } from './drivers.service.js';
import { CreateDriverDto } from './dto/create-driver.dto.js';
import { UpdateDriverDto } from './dto/update-driver.dto.js';
import { ListDriversQueryDto } from './dto/list-drivers-query.dto.js';
import { DriverResponseDto } from './dto/driver-response.dto.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { ApiPaginatedResponse } from '../../core/utils/paginated-response.js';

@ApiTags('Motoristas')
@ApiBearerAuth()
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista os motoristas com paginação',
    description:
      'A busca aceita nome. Por padrão retorna só ativos; use `active=false` para os inativos.',
  })
  @ApiPaginatedResponse(DriverResponseDto, 'Lista paginada de motoristas')
  @ApiBadRequestResponse({ description: 'Parâmetros de consulta inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  findAll(
    @Query() query: ListDriversQueryDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.driversService.findAll(query, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retorna um motorista ativo pelo id' })
  @ApiOkResponse({ description: 'Dados do motorista', type: DriverResponseDto })
  @ApiBadRequestResponse({ description: 'Id inválido' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Motorista não encontrado' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('username') actor: string,
  ) {
    return this.driversService.findOne(id, actor);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra um motorista' })
  @ApiCreatedResponse({
    description: 'Motorista criado',
    type: DriverResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  create(
    @Body() createDriverDto: CreateDriverDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.driversService.create(createDriverDto, actor);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edita um motorista',
    description:
      'Todos os campos são opcionais. Enviar `null` ou texto vazio no telefone limpa o valor.',
  })
  @ApiOkResponse({
    description: 'Motorista atualizado',
    type: DriverResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Motorista não encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDriverDto: UpdateDriverDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.driversService.update(id, updateDriverDto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desativa um motorista',
    description:
      'Soft delete (`active=false`). As cargas já criadas mantêm o snapshot de nome e telefone.',
  })
  @ApiNoContentResponse({ description: 'Motorista desativado' })
  @ApiBadRequestResponse({ description: 'Id inválido' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Motorista não encontrado' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('username') actor: string,
  ) {
    return this.driversService.remove(id, actor);
  }
}
