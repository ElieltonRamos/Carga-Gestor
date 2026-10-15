import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CompanyService } from './company.service.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
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
}
