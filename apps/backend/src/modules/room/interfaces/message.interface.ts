export interface Message {
  id: string;
  text: string;
  user: {
    id: number;
    firstName: string;
  };
  createdAt: Date;
}
