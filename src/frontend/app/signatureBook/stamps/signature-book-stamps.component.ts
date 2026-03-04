import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActionsService } from '@appRoot/actions/actions.service';
import { UserStampInterface } from '@models/user-stamp.model';
import { NotificationService } from '@service/notification/notification.service';
import { catchError, map, of, tap } from 'rxjs';

@Component({
    selector: 'app-maarch-sb-stamps',
    templateUrl: 'signature-book-stamps.component.html',
    styleUrls: ['signature-book-stamps.component.scss'],
})
export class SignatureBookStampsComponent implements OnInit {

    @Input() userId: number;

    @Output() stampsLoaded: EventEmitter<UserStampInterface> = new EventEmitter();


    loading: boolean = true;

    userStamps: UserStampInterface[] = [];

    constructor(
        public http: HttpClient,
        private notificationService: NotificationService,
        private actionsService: ActionsService
    ) {}

    async ngOnInit(): Promise<void> {
        await this.getUserSignatures();
    }

    getUserSignatures() {
        return new Promise<boolean>((resolve) => {
            this.http.get<UserStampInterface[]>(`../rest/users/${this.userId}/visaSignatures`).pipe(
                map((signatures: any) => {
                    const stamps : UserStampInterface[] = signatures.map((sign: any) => {
                        return {
                            id: sign.id,
                            userId: sign.user_serial_id,
                            title: sign.signature_label,
                            contentUrl : `../rest/users/${this.userId}/signatures/${sign.id}/content`
                        }
                    });
                    return stamps;
                }),
                tap((stamps: UserStampInterface[]) => {
                    this.userStamps = stamps;
                    this.stampsLoaded.emit(this.userStamps[0] ?? null);
                    resolve(true);
                }),
                catchError((err: any) => {
                    this.notificationService.handleSoftErrors(err);
                    return of(false);
                })
            ).subscribe();
        })
    }

    signWithStamp(stamp: UserStampInterface) {
        this.actionsService.emitActionWithData({
            id: 'selectedStamp',
            data: stamp
        });
    }
}
