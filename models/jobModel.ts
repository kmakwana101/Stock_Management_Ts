import mongoose, { Document, Schema, Model } from 'mongoose';

// Define the interface for the Job document
interface IJob extends Document {
    userId: mongoose.Schema.Types.ObjectId;
    assignTo?: mongoose.Schema.Types.ObjectId;
    organizationId: mongoose.Schema.Types.ObjectId;
    pharmaNumber: string;
    date?: Date;
    status: "Complete" | "Pending" | "Assign";
    isDeleted: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

// Define the schema
const jobSchema: Schema<IJob> = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: true,
            index: true
        },
        assignTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            index: true
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "organization",
            required: true,
            index: true
        },
        pharmaNumber: {
            type: String,
            trim: true,
            required: true
        },
        date: Date,
        status: {
            type: String,
            required: true,
            enum: ["Complete", "Pending", "Assign"]
        },
        isDeleted: {
            type: Boolean,
            required: true
        },
        createdAt: Date,
        updatedAt: Date
    },
    { timestamps: true, versionKey: false }
);

// Create and export the model
export const JOB: Model<IJob> = mongoose.model<IJob>('job', jobSchema);
