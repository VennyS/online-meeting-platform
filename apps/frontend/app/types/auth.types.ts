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
  isGuest?: boolean;
}

export interface ICheckTokenResponse {
  user: IUser;
  token: string;
}

export interface IGetTokenResponse {
  token: string;
  guestAllowed: boolean;
  name: string;
}
