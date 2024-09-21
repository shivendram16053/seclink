import mongoose, { Document, Schema } from 'mongoose';

export interface IUserBlink extends Document {
    userId: string;
    secret:string;
    price:number;
    image:string;
    userPubKey:string;
    createdAt:Date;
}

const UserBlinkSchema: Schema<IUserBlink> = new Schema({
    userId: { type: String, required: true },
    secret: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    userPubKey :{type:String,required:true},
    createdAt: { type: Date, default: Date.now },  // Optional: Track creation time

});

const userData = mongoose.models.Userr || mongoose.model<IUserBlink>('Userr', UserBlinkSchema);

export default userData;
    
