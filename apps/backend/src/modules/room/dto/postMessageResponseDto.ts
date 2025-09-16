import { PostMessageUserDto } from './postMessageDto';

export class PostMessageResponseDto {
  id: string;
  text: string;
  user: PostMessageUserDto;
  createdAt: Date;
}
