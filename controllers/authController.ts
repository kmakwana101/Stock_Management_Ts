import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { OTPGenerator, SendEmail } from '../utils/handler';
import { constants } from '../config';
import { USER } from '../models/userModel';
import { PROFILE } from '../models/profileModel';
import { RESET } from '../models/forgetPasswordModel';
import { TOKEN } from '../models/tokenModel';
import { SESSION } from '../models/sessionModel';
import { ORGANIZATION } from '../models/organizationModel';
import { Request, Response } from 'express';

const options : jwt.SignOptions = {
    expiresIn: constants.ACCESS_TOKEN_EXPIRE_IN_DAY,
    algorithm: 'RS256'
};

let secretKey : any = fs.readFileSync(__dirname + "/./../jwtRS256.key", "utf8");

export const SignUp = async (req : Request, res : Response) => {
    try {

        console.log(req.body)

        let { userName, email, password, confirmPassword, role, organizationName, address } = req.body

        if (!email) {
            throw new Error('email is required.')
        } else if (!password) {
            throw new Error('password is required.')
        } else if (!confirmPassword) {
            throw new Error('confirmPassword is required.')
        } else if (!role) {
            throw new Error('role is required.')
        } else if (!userName) {
            throw new Error('userName is required.')
        } else if (!organizationName) {
            throw new Error('organizationName is required.')
        } else if (!address) {
            throw new Error('address is required.')
        }

        // const formattedSubscriptionStartDate = moment(subscriptionStartDate, 'DD/MM/YYYY', true);
        // const formattedSubscriptionEndDate = moment(subscriptionEndDate, 'DD/MM/YYYY', true);
        // const durationInDays = formattedSubscriptionEndDate.diff(formattedSubscriptionStartDate, 'days');

        // if (!formattedSubscriptionStartDate.isValid() || !formattedSubscriptionEndDate.isValid()) {
        //     throw new Error('Please provide valid dates in DD/MM/YYYY format.')
        // }

        if (password !== confirmPassword) {
            throw new Error("Password and confirmPassword not matched.");
        }

        if (!["owner"].includes(role)) {
            throw new Error("Please provide a valid role 'owner'");
        }

        if (req.body?.password) {
            password = await bcrypt.hash(password, 9)
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            throw new Error(
                "Invalid email format."
            );
        }

        const isMail = await USER.findOne({ email: email , isDeleted : false }, { email: 1, _id: 0 })

        if (isMail) throw new Error('Email already exists.')

        // let newSubscription = await SUBSCRIPTION.create({
        //     subscriptionStartDate: formattedSubscriptionStartDate,
        //     subscriptionEndDate: formattedSubscriptionEndDate,
        //     price,
        //     durationInDays,
        // })

        const newOrganization = await ORGANIZATION.create({
            name: organizationName,
            address: address
        })

        const newUser = await USER.create({
            email: email,
            userName: userName,
            password: password,
            confirmPassword: confirmPassword,
            organizationId: newOrganization._id,
            isActive: true,
            role: role,
            createdBy: null,
            isDeleted: false,
        })

        const newProfile = await PROFILE.create({
            userId: newUser._id,
            firstName: null,
            lastName: null,
            profileImage: null,
            isDeleted: false
        })

        let profile = await PROFILE.findOne({ _id: newProfile._id }).populate('userId')

        res.status(200).json({
            status: 201,
            message: "User create successfully.",
            data: profile
        });

    } catch (error : any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const Login = async (req : Request, res : Response) => {
    try {

        console.log('first',req.body)

        const { email, password, notificationToken, ipAddress, deviceName, platform, version, buildNumber } = req.body;

        if (!email) throw new Error('email is required.');
        if (!password) throw new Error('password is required.');
        // if (!deviceName) throw new Error('deviceName is required.');
        // if (!platform) throw new Error('platform is required.');
        // if (!version) throw new Error('version is required.');
        // if (!buildNumber) throw new Error('buildNumber is required.');

        // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // if (!emailRegex.test(email)) {
        //     throw new Error(
        //         "Invalid email format."
        //     );
        // }

        console.log(
            req.body
        )

        const User = await USER.findOne({ $or: [{ email: email }, { userName: email }] , isDeleted : false });

        if (!User) {
            throw new Error('Invalid Credentials.');
        }

        const passwordMatch = await bcrypt.compare(password, User?.password)

        if (!passwordMatch) {
            throw new Error('Password invalid');
        }

        const objectToCreateToken : any = {
            userId: User?._id,
            userName: User?.userName,
            email: User?.email,
            role: User?.role,
            organizationId: User?.organizationId,
            createdAt: Date.now(),
        };

        const accessToken = jwt.sign(objectToCreateToken, secretKey , options);

        const refreshToken = jwt.sign({ userId: User._id }, secretKey, {
            expiresIn: constants.REFRESH_TOKEN_EXPIRE_IN_DAY,
            algorithm: 'RS256',
        });

        await TOKEN.create({
            accessToken: accessToken,
            refreshToken: refreshToken,
            userId: User._id,
            createdAt: Date.now()
        })

        await SESSION.create({
            notificationToken,
            jwtToken: accessToken,
            userAgent: req.get("User-Agent"),
            ipAddress: req.ip || ipAddress,
            deviceName: deviceName ? deviceName : null,
            platform: platform ? platform : null,
            userId: User._id,
            version: version ? version : null,
            buildNumber: buildNumber ? buildNumber : null,
            isActive: true,
            generatedAt: new Date(),
        });

        res.status(201).json({
            status: 201,
            message: "User Login Successfully.",
            token: accessToken,
            refreshToken,
            userId: User._id,
            role: User.role
        });

    } catch (error : any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const forgetPassword = async (req : Request, res : Response) => {
    try {
        const { email } = req.body

        if (!email) {
            throw new Error('email is required')
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            throw new Error(
                "Invalid email format."
            );
        }

        const User = await USER.findOne({ email: email , isDeleted : false });

        if (!User) {
            throw new Error('User Not Found');
        }

        await RESET.deleteMany({ email: User.email });
        // console.log(User);
        const otp = OTPGenerator()

        await RESET.create({
            verificationCode: otp,
            email: User?.email
        })

        await SendEmail(User?.email, `Forget Password `, `OTP : ${otp}`).catch(err => console.log(err));

        res.status(200).json({
            status: 200,
            message: 'Verification code sent successfully'
        });

    } catch (error : any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const compareCode = async (req : Request, res : Response) => {
    try {

        const { email, verificationCode } = req.body

        if (!email) {
            throw new Error('email is required')
        }
        if (!verificationCode) {
            throw new Error('verificationCode is required')
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            throw new Error(
                "Invalid email format."
            );
        }

        const User = await USER.findOne({ email })

        if (!User) {
            throw new Error('User Not Found');
        }

        console.log(req.body)

        const reset = await RESET.findOne({
            verificationCode: verificationCode,
            email: email,
        });

        if (!reset) {
            throw new Error("Invalid verification code.");
        }

        res.status(200).json({
            status: 200,
            message: "Your verification code is accepted.",
        });
    } catch (error : any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
}

export const resetPassword = async function (req : Request, res : Response) {
    try {
        // let password = req.body.password;
        let { email, password, confirmPassword } = req.body

        if (!email) {
            throw new Error('email is required')
        } else if (!password) {
            throw new Error('password is required')
        } else if (!confirmPassword) {
            throw new Error('confirmPassword is required')
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            throw new Error(
                "Invalid email format."
            );
        }

        if (password !== confirmPassword) {
            throw new Error("Password is not matched with confirmation password.");
        }

        const User = await USER.findOne({ email: email , isDeleted : false });

        if (!User) {
            throw new Error('User Not Found.')
        }

        const oldAndNewPasswordIsSame = await bcrypt.compare(password, User?.password)

        if (oldAndNewPasswordIsSame) {
            throw new Error('New Password Matches Old Password. Please choose a different password for security purposes.')
        }

        password = await bcrypt.hash(password, 10);

        req.body.confirmPassword = undefined;

        // console.log(mail);
        User.password = password;
        User.save();

        res.status(200).json({
            status: 200,
            message: "Your password has been reset.",
        });
    } catch (error : any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
};

export const logOut = async function (req : Request, res : Response) {
    try {
        // console.log('object',req.headers.authentication);
        // const token = req.headers["authorization"] || req.headers["authentication"] || req.body.token || req.query.token || req.headers["token"];

        // const tokenArray = token.split(" ");

        // if (!(tokenArray.length > 1)) {
        //     res.status(401).json({
        //         token: tokenArray,
        //         tokenLength: tokenArray.length,
        //         message : "Invalid Token 1",
        //         header: req.headers
        //     });
        // }

        // const authentication = tokenArray[1]

        const authentication = req.token

        if (!authentication) {
            throw new Error("Authorization token is missing.");
        }
        // console.log(token);

        const session = { jwtToken: authentication };

        await SESSION.updateOne(session, {
            isActive: false,
        });

        res.status(200).json({
            status: 200,
            message: "User Logout Successfully.",
            // accessToken: authentication,
        });
    } catch (error : any) {
        res.status(400).json({
            status: "Failed",
            message: error.message,
        });
    }
};

export const token = async (req : Request, res : Response) => {
    try {

        const refreshToken = req.body.refreshToken;

        if (!refreshToken) {
            throw new Error('Please provide a refreshToken.');
        }

        const token = await TOKEN.findOne({ refreshToken });

        if (!token) {
            throw new Error('Invalid refresh token.');
        }
        // Verify the refresh token
        const decodedToken : any = jwt.verify(refreshToken, secretKey , options);
        // console.log(decodedToken);
        // Check if decoded token is valid
        if (!decodedToken) {
            throw new Error('Invalid token.');
        }

        const tokenExpiration = new Date(decodedToken.exp * 1000);
        const currentTime = new Date();

        console.log(tokenExpiration, "tokenExpiration");
        console.log(currentTime, "currentTime")

        if (tokenExpiration <= currentTime) {
            throw new Error('Refresh token has expired.');
        }
        console.log(token)

        const session = await SESSION.findOne({ userId: token.userId, jwtToken: token.accessToken, isActive: true });

        if (!session) {
            throw new Error('User session not found.');
        }

        // Find user
        const user = await USER.findOne({ _id: session.userId , isDeleted : false });

        if (!user) {
            throw new Error('User not found.');
        }

        const accessToken = jwt.sign({

            email: user.email,
            userId: user._id,
            role: user?.role,
            userName: user?.userName,
            createdAt: Date.now()

        }, secretKey , options);


        await SESSION.findByIdAndUpdate(session._id, { $set: { jwtToken: accessToken } }, { new: true });

        res.status(201).json({
            status: 201,
            message: 'Token updated successfully.',
            accessToken: accessToken
        });
    } catch (error : any) {
        res.status(400).json({
            status: 'Failed',
            message: error.message
        });
    }
};
