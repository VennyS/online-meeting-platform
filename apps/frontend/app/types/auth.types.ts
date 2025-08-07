export interface IUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: string;
  roleId: number;
  emailVerified: boolean;
  profileImage: string;
}

export interface IAuthResponse {
  user: IUser;
  token: string;
}
