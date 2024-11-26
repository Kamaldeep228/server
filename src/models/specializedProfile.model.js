import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const specializedProfileSchema = new Schema({
    profile_id:{
        type: Schema.Types.ObjectId,
        ref: "Profile"
    },
    name: {
        type: String,
        required : true,
    },
	profileName : {
        type: String,
        required : true,
    },
	description : {
        type: String,
        required : true,
    },
	expertise: {
        type: String,
        required : true,
    },
    jobSuccessScore : {
       type: String,
       default:"No data available"
    },
    totalEarnings : {
       type: String,
       default:"No data available"
    },
    totalHours : {
       type: String,
       default:"No data available"
    },
    totalJobs : {
       type: String,
       default:"No data available"
    },
	badge: {
        type: String,
        default:"No data available"
    },
    completedWorkHistory : [{
        title: {
            type: String,
            default: 'No data available',
        },
        rating: {
            type: Number,
            default: 'No data available',
        },
        ratingCount: {
            type: String,
            default: 'No data available',
        },
        dateRange: {
            type: String,
            default: 'No data available',
        },
        feedback: {
            type: String,
            default: 'No data available',
        },
        hours : {
            type: String,
            default: 'No data available',
        },
        status: {
            type: String,
            default: "completed"
        }
    }],
    inProgressWorks: [{
        title: {
            type: String,
            default: 'No data available',
        },
        dateText: {
            type: String,
            default: 'No data available',
        },
        status: {
            type: String,
            default: "In progress"
        }
    }],
    isActive: {
        type: Boolean,
        default:true
    },
    isSpecializedProfile : {
        type: Boolean,
        default:true
    },
    url:{
       type: String,
       default:"No data available"
    }
},{timestamps:true});

specializedProfileSchema.plugin(mongooseAggregatePaginate)

export const SpecializedProfile = mongoose.model("SpecializedProfile", specializedProfileSchema)