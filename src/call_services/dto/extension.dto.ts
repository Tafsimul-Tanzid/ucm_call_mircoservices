export class CreateExtensionDto {
  extension: string;
  fullname?: string;
  secret: string;
  email_to_user?: string;
  auto_record?: string;
}

export class UpdateExtensionDto extends CreateExtensionDto {
  cookie: string;
}