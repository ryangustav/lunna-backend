export interface IAntiSpamConfig {
    enabled: boolean;
    message_threshold: number;
    time_window: number;
    action: string;
}

export interface IAntiInviteConfig {
    enabled: boolean;
    whitelisted_channels: string[];
    action: string;
}

export interface IAntiLinkConfig {
    enabled: boolean;
    whitelisted_domains: string[];
    action: string;
}

export interface IGuildSettings {
    id?: string;
    guild_id: string;
    prefix: string;
    language: string;
    mod_log_channel?: string | null;
    welcome_channel?: string | null;
    quarantine_role?: string | null;
    anti_spam: IAntiSpamConfig;
    anti_invite: IAntiInviteConfig;
    anti_link: IAntiLinkConfig;
}

export class GuildSettings implements IGuildSettings {
    public id?: string;
    public guild_id: string;
    public prefix: string;
    public language: string;
    public mod_log_channel?: string | null;
    public welcome_channel?: string | null;
    public quarantine_role?: string | null;
    public anti_spam: IAntiSpamConfig;
    public anti_invite: IAntiInviteConfig;
    public anti_link: IAntiLinkConfig;

    constructor(props: IGuildSettings) {
        this.id = props.id;
        this.guild_id = props.guild_id;
        this.prefix = props.prefix || '-';
        this.language = props.language || 'pt';
        this.mod_log_channel = props.mod_log_channel;
        this.welcome_channel = props.welcome_channel;
        this.quarantine_role = props.quarantine_role;
        this.anti_spam = props.anti_spam || { enabled: false, message_threshold: 5, time_window: 5, action: "warn" };
        this.anti_invite = props.anti_invite || { enabled: false, whitelisted_channels: [], action: "warn" };
        this.anti_link = props.anti_link || { enabled: false, whitelisted_domains: [], action: "warn" };
    }
}
