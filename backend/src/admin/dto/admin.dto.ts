import { IsArray, IsIn, IsString } from 'class-validator';

export class StatusDto {
  @IsIn(['active', 'inactive'])
  status!: 'active' | 'inactive';
}

export class FilterIdsDto {
  @IsArray()
  @IsString({ each: true })
  filterIds!: string[];
}
