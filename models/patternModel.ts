import mongoose, { Document, Schema, Model } from 'mongoose';

// Define the interface for the Pattern document
interface IPattern extends Document {
    patternNumber: string;
    organizationId: mongoose.Schema.Types.ObjectId;
    isDeleted: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// Define the schema
const patternSchema: Schema<IPattern> = new Schema(
    {
        patternNumber: {
            type: String,
            required: true,
        },
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "organization",
            required: true,
            index: true
        },
        isDeleted: {
            type: String
        },
        createdAt: {
            type: Date,
        },
        updatedAt: {
            type: Date,
        }
    },
    { timestamps: true, versionKey: false }
);

// Create and export the model
export const PATTERN : Model<IPattern> = mongoose.model<IPattern>('pattern', patternSchema);
