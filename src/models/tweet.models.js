import mongoose, {Schema} from "mongoose";

const tweetSchema = mongoose.Schema({
    image:{
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    likedBy:{
        type: Schema.Types.ObjectId,
        ref: "Like"
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: "User"
    },

},{
    timestamps: true
})


export const Tweet = mongoose.model("Tweet", tweetSchema)