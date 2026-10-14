import {
  BadRequestException,
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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserFiltersDto } from './dto/user-filter.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';
import { Public } from '../../core/decorators/public.decorator.js';

const idPipe = new ParseIntPipe({
  exceptionFactory: () => new BadRequestException('ID inválido'),
});

@ApiTags('Usuários')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autentica o usuário e retorna o token JWT' })
  @ApiOkResponse({
    description: 'Login realizado com sucesso',
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string', description: 'Token JWT (Bearer)' },
        licenseWarning: {
          type: 'string',
          nullable: true,
          description: 'Aviso de licença, presente só quando há ressalva',
        },
      },
      required: ['token'],
    },
  })
  @ApiBadRequestResponse({ description: 'Dados de login inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Credenciais inválidas, usuário inativo ou licença inválida',
  })
  @Public()
  login(@Body() loginDto: LoginDto) {
    return this.usersService.login(loginDto);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cria um usuário' })
  @ApiCreatedResponse({
    description: 'Usuário criado',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiConflictResponse({ description: 'Nome de usuário já está em uso' })
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.usersService.create(createUserDto, actor);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista usuários',
    description: 'Por padrão retorna apenas usuários ativos.',
  })
  @ApiOkResponse({ description: 'Lista de usuários', type: [UserResponseDto] })
  @ApiBadRequestResponse({ description: 'Filtros inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  findAll(@Query() filters: UserFiltersDto) {
    return this.usersService.findAll(filters);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Busca um usuário ativo pelo ID' })
  @ApiOkResponse({ description: 'Usuário encontrado', type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'ID inválido' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  findOne(
    @Param('id', idPipe) id: number,
    @CurrentUser('username') actor: string,
  ) {
    return this.usersService.findOne(id, actor);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Edita um usuário',
    description:
      'Todos os campos são opcionais. Se `password` for enviado, a senha é trocada. O usuário de ID 1 não pode ser editado.',
  })
  @ApiOkResponse({ description: 'Usuário atualizado', type: UserResponseDto })
  @ApiBadRequestResponse({
    description: 'ID ou dados inválidos, ou usuário protegido',
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  @ApiConflictResponse({ description: 'Nome de usuário já está em uso' })
  update(
    @Param('id', idPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.usersService.update(id, updateUserDto, actor);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Desativa um usuário',
    description:
      'O registro não é apagado: o usuário passa a inativo, para preservar o histórico de bipagens. O usuário de ID 1 não pode ser removido.',
  })
  @ApiOkResponse({
    description: 'Usuário desativado',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Usuário removido com sucesso' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'ID inválido ou usuário protegido' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado' })
  remove(
    @Param('id', idPipe) id: number,
    @CurrentUser('username') actor: string,
  ) {
    return this.usersService.remove(id, actor);
  }
}
