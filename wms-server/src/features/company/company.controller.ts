import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CompanyService } from './company.service.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { UpdateCompanyLogoDto } from './dto/update-company-logo.dto.js';
import { CompanyResponseDto } from './dto/company-response.dto.js';
import { CurrentUser } from '../../core/decorators/current-user.decorator.js';

@ApiTags('Empresa')
@ApiBearerAuth()
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @ApiOperation({
    summary: 'Retorna os dados da empresa',
    description:
      'O token de licença nunca é retornado, e a chave de licença sai mascarada.',
  })
  @ApiOkResponse({ description: 'Dados da empresa', type: CompanyResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Empresa não cadastrada' })
  get(@CurrentUser('username') actor: string) {
    return this.companyService.get(actor);
  }

  @Patch()
  @ApiOperation({
    summary: 'Edita os dados da empresa',
    description:
      'Todos os campos são opcionais. Enviar `null` ou texto vazio em um campo opcional limpa o valor. Alterar o CNPJ faz a licença ser revalidada com o novo CNPJ.',
  })
  @ApiOkResponse({
    description: 'Empresa atualizada',
    type: CompanyResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Dados inválidos' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Empresa não cadastrada' })
  update(
    @Body() updateCompanyDto: UpdateCompanyDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.companyService.update(updateCompanyDto, actor);
  }

  @Get('logo')
  @ApiOperation({
    summary: 'Retorna a logo da empresa',
    description:
      'Devolve a imagem como data URL (`data:image/png;base64,...`), ou `null` se não houver logo.',
  })
  @ApiOkResponse({
    description: 'Logo da empresa',
    schema: {
      type: 'object',
      properties: { logo: { type: 'string', nullable: true } },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Empresa não cadastrada' })
  getLogo(@CurrentUser('username') actor: string) {
    return this.companyService.getLogo(actor);
  }

  @Put('logo')
  @ApiOperation({
    summary: 'Define a logo da empresa',
    description:
      'Recebe a imagem como data URL PNG ou JPEG em base64. Substitui a logo anterior.',
  })
  @ApiOkResponse({
    description: 'Logo atualizada',
    schema: {
      type: 'object',
      properties: { logo: { type: 'string', nullable: true } },
    },
  })
  @ApiBadRequestResponse({ description: 'Imagem inválida' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Empresa não cadastrada' })
  setLogo(
    @Body() updateCompanyLogoDto: UpdateCompanyLogoDto,
    @CurrentUser('username') actor: string,
  ) {
    return this.companyService.setLogo(updateCompanyLogoDto, actor);
  }

  @Delete('logo')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove a logo da empresa' })
  @ApiNoContentResponse({ description: 'Logo removida' })
  @ApiUnauthorizedResponse({
    description: 'Token ausente, inválido ou expirado',
  })
  @ApiNotFoundResponse({ description: 'Empresa não cadastrada' })
  removeLogo(@CurrentUser('username') actor: string) {
    return this.companyService.removeLogo(actor);
  }
}
