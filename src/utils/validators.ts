
 

export function handleEmailError(email: string) {
  const emailRegex = /^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email) ? undefined : "Invalid email format";
}

export function handlePasswordError(password: string) {
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).+$/;
  return passwordRegex.test(password) ? undefined : "Password must contain at least one uppercase letter and one number";
}


export function handleNumberError(phoneNumber: string) {
  const phoneRegex = /^\+639\d{9}$/;
  return phoneRegex.test(phoneNumber) ? undefined : "Invalid phone number format. It should start with +639 followed by 9 digits.";
}

