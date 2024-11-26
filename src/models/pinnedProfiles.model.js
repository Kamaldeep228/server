import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const pinnedProfileSchema = new Schema({
    profile_id:{
        type: Schema.Types.ObjectId,
        ref: "SpecializedProfile"
    },
    specialization: {
        type: String,
        required : true,
        unique: true
    }
},{timestamps:true});

pinnedProfileSchema.plugin(mongooseAggregatePaginate)

export const PinnedProfiles = mongoose.model("pinnedProfile", pinnedProfileSchema)